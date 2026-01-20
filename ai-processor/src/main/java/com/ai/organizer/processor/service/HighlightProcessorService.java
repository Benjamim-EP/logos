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
import dev.langchain4j.store.embedding.filter.Filter;
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
        String cleanUserId = event.userId().replaceAll("[^a-zA-Z0-9-]", "").toLowerCase();
        boolean isGuest = cleanUserId.startsWith("guest");

        log.info("🧠 Processando Highlight ID: {} | User: '{}' | Guest: {}", event.highlightId(), event.userId(), isGuest);

        try {
            if (!isGuest) {
                HighlightEntity entity = null;
                for (int i = 0; i < 6; i++) { // 6 tentativas de 500ms
                    var opt = highlightRepository.findById(event.highlightId());
                    if (opt.isPresent()) {
                        entity = opt.get();
                        break;
                    }
                    log.warn("⏳ Highlight {} não encontrado. Tentativa {}/6. Aguardando...", event.highlightId(), i + 1);
                    Thread.sleep(500);
                }

                if (entity == null) {
                    throw new RuntimeException("Highlight ID " + event.highlightId() + " não encontrado após retries.");
                }
                
                 entity.setStatus(ProcessingStatus.PROCESSED);
                highlightRepository.save(entity);
            } else {
                log.info("👻 Bypass SQL ativado para Guest.");
            }

            if ("TEXT".equals(event.type())) {
                generateAndSaveVector(event, isGuest);
            } 

            log.info("✅ Highlight finalizado com sucesso.");

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
        String indexName = isGuest ? "GUEST-DATA" : "LOGOS (PROD)";
        
        log.info("💾 Salvando vetor no índice: {}", indexName);

        String pineconeId = targetStore.add(embeddingResponse.content(), segment);
        
        if (isGuest) {
            log.info("🛑 Guest detectado. Interrompendo fluxo de Shooting Star.");
            return;
        }

        findAndLinkGalaxies(embeddingResponse.content(), event.userId(), String.valueOf(event.highlightId()));
    }

     private void findAndLinkGalaxies(Embedding highlightVector, String userId, String highlightId) {
        log.info("🔎 [SHOOTING STAR] Procurando Galáxias para User: {}", userId);
        try {
            Filter userFilter = MetadataFilterBuilder.metadataKey("userId").isEqualTo(userId);
            Filter typeFilter = MetadataFilterBuilder.metadataKey("type").isEqualTo("galaxy");
            Filter compositeFilter = userFilter.and(typeFilter);

            EmbeddingSearchRequest request = EmbeddingSearchRequest.builder()
                    .queryEmbedding(highlightVector)
                    .filter(compositeFilter)
                    .minScore(0.35) 
                    .maxResults(5)
                    .build();

            var matches = userStore.search(request).matches();

            log.info("   -> Encontradas {} galáxias candidatas.", matches.size());

            for (var match : matches) {
                if (match.embedded() == null || match.embedded().metadata() == null) continue;

                String galaxyId = match.embedded().metadata().getString("galaxyId");
                
                if (galaxyId != null) {
                    StarLinkedEvent linkEvent = new StarLinkedEvent(galaxyId, highlightId, match.score());
                    String json = objectMapper.writeValueAsString(linkEvent);
                    kafkaTemplate.send("star.linked", galaxyId, json);
                    log.info("🔗 Link detectado com Galáxia {}", galaxyId);
                } 
            }
        } catch (Exception e) {
            log.error("Erro na busca reversa de galáxias", e);
        }
    }
}