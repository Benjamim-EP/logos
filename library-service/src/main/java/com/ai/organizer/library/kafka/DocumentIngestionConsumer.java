
package com.ai.organizer.library.kafka;

import com.ai.organizer.library.domain.Document;
import com.ai.organizer.library.event.IngestionEvent;
import com.ai.organizer.library.repository.DocumentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class DocumentIngestionConsumer {

    private final DocumentRepository documentRepository;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "document.ingestion", groupId = "library-service-group")
    public void consume(String message) {
        try {
            // Desserializa manualmente para ter controle de erro
            IngestionEvent event = objectMapper.readValue(message, IngestionEvent.class);
            log.info("📚 Ingestão recebida na Biblioteca: {}", event.originalName());

            // Idempotência: Se já existe, não cria de novo
            if (documentRepository.findByFileHash(event.fileHash()).isPresent()) {
                log.info("Documento já existe na biblioteca: {}", event.fileHash());
                return;
            }

            // Cria o documento minimalista
            Document doc = new Document(
                event.originalName(),
                event.fileHash(),
                event.userId(),
                event.s3Key(),
                event.fileSize() 
            );

            documentRepository.save(doc);
            log.info("✅ Documento registrado na estante: {}", doc.getTitle());

        } catch (Exception e) {
            log.error("❌ Erro ao processar ingestão na biblioteca", e);
        }
    }
}