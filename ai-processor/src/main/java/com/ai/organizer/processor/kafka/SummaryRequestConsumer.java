package com.ai.organizer.processor.kafka;

import com.ai.organizer.processor.service.SummaryProcessorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class SummaryRequestConsumer {

    private final SummaryProcessorService summaryService;

    @KafkaListener(topics = "summary.requested", groupId = "ai-processor-summaries")
    public void consume(String message) {
        log.info("🧠 Recebido pedido de resumo.");
        summaryService.processSummaryRequest(message);
    }
}