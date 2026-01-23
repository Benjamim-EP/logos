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

    private final EmbeddingStore<TextSegment> embeddingStore;

     @KafkaListener(topics = "data.deleted", groupId = "ai-processor-cleanup-v4") // v4 para garantir rebalanceamento se necessário
    public void consumeDeletion(String message) {
        try {
            String cleanMessage = message.replace("\"", "").trim();
            log.info("🧹 [CLEANUP] Iniciando limpeza para: {}", cleanMessage);

            String[] parts = cleanMessage.split(":");
            if (parts.length < 2) return;

            String type = parts[0].trim();
            String id = parts[1].trim();

            // Lógica de seleção da chave de metadados
            String metadataKey;
            if ("HIGHLIGHT".equals(type)) {
                metadataKey = "highlightId";
            } else if ("SUMMARY".equals(type)) {
                metadataKey = "summaryId";
            } else if ("GALAXY".equals(type)) { // <--- Nova lógica
                metadataKey = "galaxyId";
            } else {
                log.warn("⚠️ Tipo desconhecido para deleção: {}", type);
                return;
            }

            Filter metadataFilter = MetadataFilterBuilder.metadataKey(metadataKey).isEqualTo(id);
            
            // Cria um vetor dummy para fazer a busca por metadados (limitação da API do LangChain4j/Pinecone wrapper)
            float[] dummyVector = new float[1536]; 
            
            EmbeddingSearchRequest searchRequest = EmbeddingSearchRequest.builder()
                    .queryEmbedding(dev.langchain4j.data.embedding.Embedding.from(dummyVector))
                    .filter(metadataFilter)
                    .maxResults(10) // Geralmente é 1, mas prevenimos duplicatas
                    .build();

            EmbeddingSearchResult<TextSegment> searchResult = embeddingStore.search(searchRequest);
            List<EmbeddingMatch<TextSegment>> matches = searchResult.matches();

            if (matches.isEmpty()) {
                log.warn("⚠️ Nenhum vetor encontrado no Pinecone para {} ID: {}", type, id);
                return;
            }

            // Remove todos os vetores encontrados
            for (EmbeddingMatch<TextSegment> match : matches) {
                String pineconeVectorId = match.embeddingId();
                log.info("🗑️ Apagando vetor do Pinecone. ID Interno: {}", pineconeVectorId);
                embeddingStore.remove(pineconeVectorId);
            }

            log.info("✅ Limpeza concluída no Pinecone para {} ID: {}", type, id);

        } catch (Exception e) {
            log.error("❌ Erro ao processar limpeza de dados", e);
        }
    }
}