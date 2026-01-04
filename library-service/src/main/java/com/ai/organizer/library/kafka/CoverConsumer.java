package com.ai.organizer.library.kafka;

import com.ai.organizer.library.domain.Document;
import com.ai.organizer.library.event.CoverGeneratedEvent;
import com.ai.organizer.library.repository.DocumentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Slf4j
@RequiredArgsConstructor
public class CoverConsumer {

    private final DocumentRepository documentRepository;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "document.cover.generated", groupId = "library-service-covers")
    @Transactional
    public void consumeCoverEvent(String message) {
        try {
            CoverGeneratedEvent event = objectMapper.readValue(message, CoverGeneratedEvent.class);
            log.info("🖼️ Recebido aviso de capa para: {}", event.fileHash());

            // Atualiza o documento
            documentRepository.findByFileHash(event.fileHash()).ifPresentOrElse(doc -> {
                doc.setCoverPath(event.coverPath());
                documentRepository.save(doc);
                log.info("✅ Capa atualizada no banco para o livro: {}", doc.getTitle());
            }, () -> {
                log.warn("⚠️ Documento não encontrado para o hash: {}", event.fileHash());
            });

        } catch (Exception e) {
            log.error("❌ Erro ao processar evento de capa", e);
        }
    }
}