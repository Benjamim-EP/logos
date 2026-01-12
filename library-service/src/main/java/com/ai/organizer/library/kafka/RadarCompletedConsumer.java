package com.ai.organizer.library.kafka;

import com.ai.organizer.library.repository.UserProfileRepository;
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
public class RadarCompletedConsumer {

    private final UserProfileRepository profileRepository;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "radar.update.completed", groupId = "library-radar-updater-v3")
    @Transactional
    public void consumeRadarResult(String message) {
        log.info("📩 [RADAR] Recebida mensagem de conclusão: {}", message);
        try {
            
            JsonNode jsonNode = objectMapper.readTree(message);
            if (jsonNode.isTextual()) {
                jsonNode = objectMapper.readTree(jsonNode.asText());
            }

            
            String userId = jsonNode.get("userId").asText();
            String radarContent = jsonNode.get("radarJson").asText();

           
            profileRepository.findById(userId).ifPresentOrElse(profile -> {
                profile.setRadarData(radarContent);
                profileRepository.save(profile);
                log.info("✅ Radar persistido com sucesso para o usuário: {}", userId);
            }, () -> log.warn("⚠️ Perfil não encontrado para o usuário: {}", userId));

        } catch (Exception e) {
            log.error("❌ Erro ao persistir resultado do radar. Payload: {}", message, e);
        }
    }
}