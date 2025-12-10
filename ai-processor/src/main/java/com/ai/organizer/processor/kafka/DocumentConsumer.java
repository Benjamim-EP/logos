package com.ai.organizer.processor.kafka;

import com.ai.organizer.processor.IngestionEvent;
import com.ai.organizer.processor.service.ProcessorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class DocumentConsumer {

    private final ProcessorService processorService;

    @KafkaListener(topics = "document.ingestion", groupId = "ai-processor-group")
    public void consume(IngestionEvent event) {
        log.info("📨 Evento recebido do Kafka: {}", event.originalName());
        processorService.processDocument(event);
    }
}