package com.ai.organizer.library.service;

import com.ai.organizer.library.event.RadarUpdateRequestedEvent;
import com.ai.organizer.library.repository.UserHighlightRepository;
import com.ai.organizer.library.repository.UserSummaryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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


    public void checkAndTrigger(String userId) {
        long totalItems = highlightRepository.countByUserId(userId) + summaryRepository.countByUserId(userId);

        if (totalItems == 1 || totalItems % 30 == 0) {
            log.info("🎯 Marco de conhecimento atingido (Total: {}). Recalculando Radar...", totalItems);
            triggerUpdate(userId);
        }
    }

    private void triggerUpdate(String userId) {
        try {
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