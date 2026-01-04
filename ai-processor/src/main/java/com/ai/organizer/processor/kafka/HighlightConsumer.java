package com.ai.organizer.processor.kafka;

import com.ai.organizer.processor.HighlightEvent;
import com.ai.organizer.processor.service.ProcessorService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class HighlightConsumer {

    private final ProcessorService processorService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "highlight.created", groupId = "ai-processor-highlights")
    public void consume(String message) { // Recebe String
        try {
            // Converte manualmente
            HighlightEvent event = objectMapper.readValue(message, HighlightEvent.class);
            
            log.info("🖍️ Highlight recebido: {}", event.content());
            processorService.processHighlight(event);
            
        } catch (Exception e) {
            log.error("❌ Erro ao ler highlight JSON: {}", message, e);
        }
    }
}