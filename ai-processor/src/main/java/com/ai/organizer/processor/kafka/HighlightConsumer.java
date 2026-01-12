package com.ai.organizer.processor.kafka;

import com.ai.organizer.processor.HighlightEvent;
import com.ai.organizer.processor.service.ProcessorService;
import com.fasterxml.jackson.databind.JsonNode;
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

    @KafkaListener(topics = "highlight.created", groupId = "ai-processor-highlights-v2")
    public void consume(String message) {
        try {
            log.info("🖍️ [HIGHLIGHT] Mensagem recebida: {}", message);

            JsonNode jsonNode = objectMapper.readTree(message);
            if (jsonNode.isTextual()) {
                log.info("⚠️ JSON encapsulado detectado. Realizando segundo parse...");
                jsonNode = objectMapper.readTree(jsonNode.asText());
            }

            HighlightEvent event = objectMapper.treeToValue(jsonNode, HighlightEvent.class);
            
            log.info("✅ Highlight ID {} validado. Iniciando vetorização...", event.highlightId());
            processorService.processHighlight(event);
            
        } catch (Exception e) {
            log.error("❌ Erro ao processar highlight JSON: {}", message, e);
        }
    }
}