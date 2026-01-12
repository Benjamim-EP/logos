package com.ai.organizer.library.kafka;

import com.ai.organizer.library.domain.StarGalaxyLink;
import com.ai.organizer.library.domain.UserGalaxy;
import com.ai.organizer.library.event.StarLinkedEvent;
import com.ai.organizer.library.repository.StarGalaxyLinkRepository;
import com.ai.organizer.library.repository.UserGalaxyRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Slf4j
@RequiredArgsConstructor
public class StarLinkedConsumer {

    private final StarGalaxyLinkRepository linkRepository;
    private final UserGalaxyRepository galaxyRepository;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "star.linked", groupId = "library-linker-v1")
    @Transactional
    public void consumeLink(String message) {
        try {
            
            String clean = message.startsWith("\"") ? message.substring(1, message.length()-1).replace("\\\"", "\"") : message;
            
            StarLinkedEvent event = objectMapper.readValue(clean, StarLinkedEvent.class);
            
            UserGalaxy galaxy = galaxyRepository.findById(Long.valueOf(event.galaxyId())).orElseThrow();

            StarGalaxyLink link = new StarGalaxyLink(galaxy, event.starId(), event.score());
            linkRepository.save(link);
            
            log.info("🔗 Link persistido: Estrela {} atraída por Galáxia {}", event.starId(), event.galaxyId());

        } catch (Exception e) {
            log.error("Erro ao persistir link automático", e);
        }
    }
}