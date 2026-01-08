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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
@Slf4j
@RequiredArgsConstructor
public class HighlightProcessorService {

    private final HighlightRepository highlightRepository;
    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Transactional
    public void processHighlight(HighlightEvent event) {
        log.info("🧠 Processando Highlight ID: {} | Tipo: {}", event.highlightId(), event.type());

        try {
            // 1. Recupera do Banco
            HighlightEntity entity = highlightRepository.findById(event.highlightId())
                    .orElseThrow(() -> new RuntimeException("Highlight não encontrado: " + event.highlightId()));

            // 2. Lógica de Vetorização
            if ("TEXT".equals(event.type())) {
                generateAndSaveVector(event, entity);
            } else {
                log.info("🚧 Processamento de Imagem (OCR) será implementado na v2");
            }

            // 3. Atualiza Status no Postgres
            entity.setStatus(ProcessingStatus.PROCESSED);
            highlightRepository.save(entity);
            
            log.info("✅ Highlight ID {} finalizado com sucesso.", event.highlightId());

        } catch (Exception e) {
            log.error("❌ Falha ao processar highlight ID {}", event.highlightId(), e);
        }
    }

    private void generateAndSaveVector(HighlightEvent event, HighlightEntity entity) {
        log.info("▶️ Gerando Embedding específico para o trecho...");

        Metadata metadata = Metadata.from("userId", event.userId())
                .put("fileHash", event.fileHash())
                .put("type", "highlight")
                .put("highlightId", String.valueOf(entity.getId()))
                // --- ESSA LINHA É CRUCIAL PARA NOVOS REGISTROS ---
                .put("text", event.content()); 
                // -------------------------------------------------

        TextSegment segment = TextSegment.from(event.content(), metadata);
        Response<Embedding> embeddingResponse = embeddingModel.embed(segment);

        String pineconeId = embeddingStore.add(embeddingResponse.content(), segment);
        log.info("✅ Vetor salvo no Pinecone com ID: {}", pineconeId);
        
        findAndLinkGalaxies(embeddingResponse.content(), event.userId(), String.valueOf(entity.getId()));
    }

     private void findAndLinkGalaxies(Embedding highlightVector, String userId, String highlightId) {
        log.info("🔎 [SHOOTING STAR] Procurando Galáxias próximas para o Highlight ID: {}", highlightId);
        try {
            // 1. Busca vetores do tipo 'galaxy'
            EmbeddingSearchRequest request = EmbeddingSearchRequest.builder()
                    .queryEmbedding(highlightVector)
                    .filter(MetadataFilterBuilder.metadataKey("type").isEqualTo("galaxy"))
                    .minScore(0.35) // Score mínimo para considerar atração
                    .maxResults(5)  // Pode pertencer a até 5 galáxias
                    .build();

            var matches = embeddingStore.search(request).matches();

            log.info("   -> Encontradas {} galáxias candidatas no Pinecone.", matches.size());

            // 2. Processa matches
            for (var match : matches) {
                // Defesa contra nulos nos metadados
                if (match.embedded() == null || match.embedded().metadata() == null) continue;

                String galaxyUserId = match.embedded().metadata().getString("userId");
                String galaxyId = match.embedded().metadata().getString("galaxyId");
                
                log.info("      * Candidata: ID={} | User={} | Score={}", galaxyId, galaxyUserId, match.score());

                // Verifica se a galáxia pertence ao mesmo usuário
                if (userId.equals(galaxyUserId) && galaxyId != null) {
                    StarLinkedEvent linkEvent = new StarLinkedEvent(galaxyId, highlightId, match.score());
                    String json = objectMapper.writeValueAsString(linkEvent);
                    
                    // Envia para a Library salvar o link no SQL
                    kafkaTemplate.send("star.linked", galaxyId, json);
                    log.info("🔗 LINK DETECTADO: Highlight {} atraído por Galáxia {}", highlightId, galaxyId);
                } else {
                    log.info("      - Ignorada (Usuário diferente ou ID nulo)");
                }
            }
        } catch (Exception e) {
            log.error("Erro na busca reversa de galáxias", e);
        }
    }
}