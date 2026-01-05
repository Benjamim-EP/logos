package com.ai.organizer.library.service;

import com.ai.organizer.library.domain.UserHighlight;
import com.ai.organizer.library.domain.UserSummary;
import com.ai.organizer.library.event.RadarUpdateRequestedEvent;
import com.ai.organizer.library.repository.UserHighlightRepository;
import com.ai.organizer.library.repository.UserSummaryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RadarTriggerService {

    private final UserHighlightRepository highlightRepository;
    private final UserSummaryRepository summaryRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Verifica se o usuário atingiu o marco de 30 itens e solicita atualização do Radar.
     */
    public void checkAndTrigger(String userId) {
        long totalItems = highlightRepository.countByUserId(userId) + summaryRepository.countByUserId(userId);

        // Regra de Negócio: Recalcula no 1º item (para não ficar vazio) e depois de 30 em 30.
        if (totalItems == 1 || totalItems % 30 == 0) {
            log.info("🎯 Marco de conhecimento atingido (Total: {}). Recalculando Radar...", totalItems);
            triggerUpdate(userId);
        }
    }

    private void triggerUpdate(String userId) {
        try {
            // Busca os últimos 30 snippets para contexto (limitando a 255 chars cada para economizar tokens)
            // Aqui fazemos uma busca simples nas marcações
            List<String> snippets = highlightRepository.findAll().stream()
                    .filter(h -> h.getUserId().equals(userId))
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .limit(30)
                    .map(h -> h.getContent().length() > 255 ? h.getContent().substring(0, 255) : h.getContent())
                    .collect(Collectors.toList());

            RadarUpdateRequestedEvent event = new RadarUpdateRequestedEvent(userId, snippets);
            String json = objectMapper.writeValueAsString(event);
            
            kafkaTemplate.send("radar.update.requested", userId, json);
        } catch (Exception e) {
            log.error("Erro ao disparar atualização de radar", e);
        }
    }
}