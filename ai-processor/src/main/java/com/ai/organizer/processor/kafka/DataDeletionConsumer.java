package com.ai.organizer.processor.kafka;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingSearchResult;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.filter.MetadataFilterBuilder;
import dev.langchain4j.store.embedding.filter.Filter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class DataDeletionConsumer {

    // IMPORTANTE: Tipamos como TextSegment para poder acessar os metadados na busca
    private final EmbeddingStore<TextSegment> embeddingStore;

    @KafkaListener(topics = "data.deleted", groupId = "ai-processor-cleanup-v3")
    public void consumeDeletion(String message) {
        try {
            String cleanMessage = message.replace("\"", "").trim();
            log.info("🧹 [CLEANUP] Iniciando limpeza para: {}", cleanMessage);

            String[] parts = cleanMessage.split(":");
            String type = parts[0].trim();
            String id = parts[1].trim();

            // 1. Define o filtro de metadados baseado no tipo
            String metadataKey = "HIGHLIGHT".equals(type) ? "highlightId" : "summaryId";
            Filter metadataFilter = MetadataFilterBuilder.metadataKey(metadataKey).isEqualTo(id);

            // 2. BUSCA: Como removeAll(Filter) não funciona, buscamos os IDs primeiro
            // Usamos um vetor de busca vazio (dummy) de 1536 posições (OpenAI standard)
            float[] dummyVector = new float[1536]; 
            
            EmbeddingSearchRequest searchRequest = EmbeddingSearchRequest.builder()
                    .queryEmbedding(dev.langchain4j.data.embedding.Embedding.from(dummyVector))
                    .filter(metadataFilter)
                    .maxResults(10) // Normalmente é 1 para 1, mas usamos 10 por segurança
                    .build();

            EmbeddingSearchResult<TextSegment> searchResult = embeddingStore.search(searchRequest);
            List<EmbeddingMatch<TextSegment>> matches = searchResult.matches();

            if (matches.isEmpty()) {
                log.warn("⚠️ Nenhum vetor encontrado no Pinecone para {} ID: {}", type, id);
                return;
            }

            // 3. EXCLUSÃO POR ID: Agora apagamos cada um encontrado
            for (EmbeddingMatch<TextSegment> match : matches) {
                String pineconeVectorId = match.embeddingId();
                log.info("🗑️ Apagando ID Vetorial: {}", pineconeVectorId);
                
                // O método remove(id) é suportado!
                embeddingStore.remove(pineconeVectorId);
            }

            log.info("✅ Limpeza concluída no Pinecone para {} ID: {}", type, id);

        } catch (Exception e) {
            log.error("❌ Erro ao processar workaround de limpeza", e);
        }
    }
}