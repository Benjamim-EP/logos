package com.ai.organizer.library.kafka;

import com.ai.organizer.library.domain.UserSummary;
import com.ai.organizer.library.event.SummaryCompletedEvent;
import com.ai.organizer.library.repository.UserSummaryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Slf4j
@RequiredArgsConstructor
public class SummaryCompletedConsumer {

    private final UserSummaryRepository summaryRepository;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "summary.completed", groupId = "library-summary-updater")
    @Transactional
    public void consume(String message) {
        try {
            SummaryCompletedEvent event = objectMapper.readValue(message, SummaryCompletedEvent.class);
            
            summaryRepository.findById(event.summaryId()).ifPresent(summary -> {
                summary.setGeneratedText(event.generatedText());
                summary.setStatus(event.status());
                summaryRepository.save(summary);
                log.info("✅ Resumo ID {} atualizado com status: {}", event.summaryId(), event.status());
            });

        } catch (Exception e) {
            log.error("Erro ao salvar resumo concluído", e);
        }
    }
}