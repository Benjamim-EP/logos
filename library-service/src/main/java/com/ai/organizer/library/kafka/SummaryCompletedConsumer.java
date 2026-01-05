package com.ai.organizer.library.kafka;

import com.ai.organizer.library.domain.UserSummary;
import com.ai.organizer.library.event.SummaryCompletedEvent;
import com.ai.organizer.library.repository.UserSummaryRepository;
import com.ai.organizer.library.service.RadarTriggerService; // <--- Injeção do Gatilho
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consumidor responsável por finalizar o ciclo de vida de um resumo.
 * Atualiza o banco de dados relacional com o texto gerado pela IA e 
 * dispara a atualização do Radar de Conhecimento.
 * 
 * Aplicando princípios de:
 * - Designing Data-Intensive Applications (Cap 11): Stream Processing e Consistência Eventual.
 * - Clean Architecture (Cap 20): Regras de Negócio disparadas por eventos.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class SummaryCompletedConsumer {

    private final UserSummaryRepository summaryRepository;
    private final RadarTriggerService radarTriggerService; // <--- Injetado
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "summary.completed", groupId = "library-summary-updater")
    @Transactional
    public void consume(String message) {
        try {
            // 1. Tratamento de Resiliência: Parse manual para evitar erros de Serialização/Headers
            // Identificamos em fases anteriores que o Kafka pode enviar JSON encasulado em String
            JsonNode jsonNode = objectMapper.readTree(message);
            if (jsonNode.isTextual()) {
                jsonNode = objectMapper.readTree(jsonNode.asText());
            }

            // Converte para o Record do evento
            SummaryCompletedEvent event = objectMapper.treeToValue(jsonNode, SummaryCompletedEvent.class);
            
            log.info("📩 [RESUMO COMPLETO] Processando conclusão do resumo ID: {}", event.summaryId());

            // 2. Persistência no Banco Relacional (Postgres)
            summaryRepository.findById(event.summaryId()).ifPresentOrElse(summary -> {
                summary.setGeneratedText(event.generatedText());
                summary.setStatus(event.status());
                
                // Salva o estado final (COMPLETED ou FAILED)
                summaryRepository.save(summary);
                log.info("✅ Status do resumo {} atualizado para: {}", event.summaryId(), event.status());

                // 3. GATILHO DO RADAR (Fase 2.5)
                // Se o resumo foi concluído com sucesso, verificamos se é hora de recalcular o Radar
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