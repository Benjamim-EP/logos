package com.ai.organizer.processor.kafka;

import com.ai.organizer.processor.IngestionEvent;
import com.ai.organizer.processor.service.ProcessorService;
import com.fasterxml.jackson.databind.ObjectMapper; // Importante
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class DocumentConsumer {

    private final ProcessorService processorService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "document.ingestion", groupId = "ai-processor-group")
    public void consume(String message) {
        try {
            log.info("📨 Payload bruto recebido: {}", message);
            
            IngestionEvent event = objectMapper.readValue(message, IngestionEvent.class);
            
            log.info("✅ Evento processado: {}", event.originalName());
            processorService.processDocument(event);
            
        } catch (Exception e) {
            log.error("❌ Erro fatal ao processar mensagem JSON: {}", message, e);
           
        }
    }
}