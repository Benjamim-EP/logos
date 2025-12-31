package com.ai.organizer.processor.kafka;

import com.ai.organizer.processor.HighlightEvent;
import com.ai.organizer.processor.service.ProcessorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class HighlightConsumer {

    private final ProcessorService processorService;

    @KafkaListener(topics = "highlight.created", groupId = "ai-processor-highlights")
    public void consume(HighlightEvent event) {
        log.info("🖍️ Highlight recebido: {} (Tipo: {})", event.content().substring(0, Math.min(20, event.content().length())) + "...", event.type());
        
        processorService.processHighlight(event);
    }
}