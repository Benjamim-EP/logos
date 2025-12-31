package com.ai.organizer.processor.service;

import com.ai.organizer.processor.HighlightEvent;
import com.ai.organizer.processor.domain.HighlightEntity;
import com.ai.organizer.processor.domain.enums.ProcessingStatus;
import com.ai.organizer.processor.repository.HighlightRepository;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.store.embedding.EmbeddingStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List; // <--- Importante para o fix do addAll

@Service
@Slf4j
@RequiredArgsConstructor
public class HighlightProcessorService {

    private final HighlightRepository highlightRepository;
    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;

    @Transactional
    public void processHighlight(HighlightEvent event) {
        log.info("🧠 Processando Highlight ID: {} | Tipo: {}", event.highlightId(), event.type());

        try {
            // 1. Recupera do Banco (Garantia de consistência)
            HighlightEntity entity = highlightRepository.findById(event.highlightId())
                    .orElseThrow(() -> new RuntimeException("Highlight não encontrado: " + event.highlightId()));

            // 2. Lógica de Vetorização (Apenas se for TEXTO por enquanto)
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
            // Em produção: Atualizar status para FAILED via nova transação
        }
    }

    private void generateAndSaveVector(HighlightEvent event, HighlightEntity entity) {
        log.info("▶️ Gerando Embedding específico para o trecho...");

        // Metadados Ricos
        Metadata metadata = new Metadata();
        metadata.put("userId", event.userId());
        metadata.put("fileHash", event.fileHash());
        metadata.put("type", "highlight");
        metadata.put("dbId", String.valueOf(entity.getId()));
        
        // Cria o segmento com o texto EXATO da marcação
        TextSegment segment = TextSegment.from(event.content(), metadata);

        // Gera o vetor
        Response<Embedding> embeddingResponse = embeddingModel.embed(segment);

        // CORREÇÃO: Usamos o método 'add' que aceita Vetor + Segmento (Metadados).
        // O Pinecone vai gerar um ID único para este vetor, e retorná-lo.
        // O vínculo com o Postgres está garantido pelo campo "dbId" dentro dos metadados.
        String pineconeId = embeddingStore.add(embeddingResponse.content(), segment);
        
        log.info("✅ Vetor salvo no Pinecone com ID gerado: {} (Vínculo DB: {})", pineconeId, entity.getId());
    }
}