package com.ai.organizer.library.kafka;

import com.ai.organizer.library.event.SummaryCompletedEvent;
import com.ai.organizer.library.repository.UserSummaryRepository;
import com.ai.organizer.library.service.RadarTriggerService;
import com.fasterxml.jackson.databind.JsonNode;
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
    private final RadarTriggerService radarTriggerService; 
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "summary.completed", groupId = "library-summary-updater")
    @Transactional
    public void consume(String message) {
        try {
            
            JsonNode jsonNode = objectMapper.readTree(message);
            if (jsonNode.isTextual()) {
                jsonNode = objectMapper.readTree(jsonNode.asText());
            }

            
            SummaryCompletedEvent event = objectMapper.treeToValue(jsonNode, SummaryCompletedEvent.class);
            
            log.info("📩 [RESUMO COMPLETO] Processando conclusão do resumo ID: {}", event.summaryId());

            
            summaryRepository.findById(event.summaryId()).ifPresentOrElse(summary -> {
                summary.setGeneratedText(event.generatedText());
                summary.setStatus(event.status());
                
                
                summaryRepository.save(summary);
                log.info("✅ Status do resumo {} atualizado para: {}", event.summaryId(), event.status());

                
                if ("COMPLETED".equalsIgnoreCase(event.status())) {
                    log.info("🎯 Disparando verificação de marco para o radar do usuário: {}", summary.getUserId());
                    radarTriggerService.checkAndTrigger(summary.getUserId());
                }
                
            }, () -> log.warn("⚠️ Tentativa de atualizar resumo inexistente. ID: {}", event.summaryId()));

        } catch (Exception e) {
            log.error("❌ Erro crítico ao processar conclusão de resumo no Kafka", e);
        }
    }
}