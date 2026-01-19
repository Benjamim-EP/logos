package com.ai.organizer.processor.service;

import com.ai.organizer.processor.HighlightEvent;
import com.ai.organizer.processor.domain.HighlightEntity;
import com.ai.organizer.processor.domain.enums.ProcessingStatus;
import com.ai.organizer.processor.event.StarLinkedEvent;
import com.ai.organizer.processor.repository.HighlightRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.filter.MetadataFilterBuilder;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class HighlightProcessorService {

    private final HighlightRepository highlightRepository;
    private final EmbeddingModel embeddingModel;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    
    private final EmbeddingStore<TextSegment> userStore;
    private final EmbeddingStore<TextSegment> guestStore;

    public HighlightProcessorService(
            HighlightRepository highlightRepository,
            EmbeddingModel embeddingModel,
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper,
            @Qualifier("userEmbeddingStore") EmbeddingStore<TextSegment> userStore,
            @Qualifier("guestEmbeddingStore") EmbeddingStore<TextSegment> guestStore) {
        this.highlightRepository = highlightRepository;
        this.embeddingModel = embeddingModel;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.userStore = userStore;
        this.guestStore = guestStore;
    }

    @Transactional
    public void processHighlight(HighlightEvent event) {
        log.info("🧠 Processando Highlight ID: {} | User: {}", event.highlightId(), event.userId());
        boolean isGuest = event.userId().startsWith("guest-");

        try {
            if (!isGuest) {
                HighlightEntity entity = highlightRepository.findById(event.highlightId())
                        .orElseThrow(() -> new RuntimeException("Highlight não encontrado no SQL"));
                
                entity.setStatus(ProcessingStatus.PROCESSED);
                highlightRepository.save(entity);
            }

            if ("TEXT".equals(event.type())) {
                generateAndSaveVector(event, isGuest);
            } 

            log.info("✅ Highlight finalizado. Guest Mode: {}", isGuest);

        } catch (Exception e) {
            log.error("❌ Falha ao processar highlight", e);
        }
    }

    private void generateAndSaveVector(HighlightEvent event, boolean isGuest) {
        Metadata metadata = Metadata.from("userId", event.userId())
                .put("fileHash", event.fileHash())
                .put("type", "highlight")
                .put("highlightId", String.valueOf(event.highlightId()))
                .put("text", event.content()); 

        TextSegment segment = TextSegment.from(event.content(), metadata);
        Response<Embedding> embeddingResponse = embeddingModel.embed(segment);

        EmbeddingStore<TextSegment> targetStore = isGuest ? guestStore : userStore;
        String pineconeId = targetStore.add(embeddingResponse.content(), segment);
        
        log.info("✅ Vetor salvo no Pinecone ({}) com ID: {}", isGuest ? "guest-data" : "logos", pineconeId);
        
        if (!isGuest) {
            findAndLinkGalaxies(embeddingResponse.content(), event.userId(), String.valueOf(event.highlightId()));
        }
    }

     private void findAndLinkGalaxies(Embedding highlightVector, String userId, String highlightId) {
        try {
            EmbeddingSearchRequest request = EmbeddingSearchRequest.builder()
                    .queryEmbedding(highlightVector)
                    .filter(MetadataFilterBuilder.metadataKey("type").isEqualTo("galaxy"))
                    .minScore(0.35) 
                    .maxResults(5)
                    .build();

            var matches = userStore.search(request).matches();

            for (var match : matches) {
                if (match.embedded() == null || match.embedded().metadata() == null) continue;

                String galaxyUserId = match.embedded().metadata().getString("userId");
                String galaxyId = match.embedded().metadata().getString("galaxyId");
                
                if (userId.equals(galaxyUserId) && galaxyId != null) {
                    StarLinkedEvent linkEvent = new StarLinkedEvent(galaxyId, highlightId, match.score());
                    String json = objectMapper.writeValueAsString(linkEvent);
                    kafkaTemplate.send("star.linked", galaxyId, json);
                } 
            }
        } catch (Exception e) {
            log.error("Erro na busca reversa de galáxias", e);
        }
    }
}