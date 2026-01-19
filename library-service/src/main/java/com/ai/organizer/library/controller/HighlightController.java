package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.UserHighlight;
import com.ai.organizer.library.event.HighlightEvent;
import com.ai.organizer.library.repository.UserHighlightRepository;
import com.ai.organizer.library.service.RadarTriggerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/library/highlights")
@RequiredArgsConstructor
@Slf4j
public class HighlightController {

    private final UserHighlightRepository userHighlightRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final RadarTriggerService radarTriggerService;

    public record CreateHighlightRequest(String fileHash, String content, String type, String position) {}

    @PostMapping
    public ResponseEntity<Long> createHighlight(
            @RequestBody CreateHighlightRequest request,
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "X-Guest-Mode", required = false) String isGuestHeader,
            @RequestHeader(name = "X-User-Id", required = false) String guestUserId
    ) {
        boolean isGuest = "true".equalsIgnoreCase(isGuestHeader);
        String userId = isGuest ? guestUserId : jwt.getClaimAsString("preferred_username");
        
        Long highlightId;

        if (isGuest) {
            highlightId = -Math.abs(ThreadLocalRandom.current().nextLong(1000000, 9999999));
            log.info("👻 Guest Highlight. ID Temporário: {}", highlightId);
        } else {
            UserHighlight hl = new UserHighlight();
            hl.setFileHash(request.fileHash());
            hl.setUserId(userId);
            hl.setContent(request.content());
            hl.setType(request.type());
            hl.setPositionJson(request.position());
            
            UserHighlight saved = userHighlightRepository.save(hl);
            highlightId = saved.getId();
            log.info("💾 Highlight salvo no SQL. ID: {}", highlightId);
            
            radarTriggerService.checkAndTrigger(userId);
        }

        try {
            HighlightEvent event = new HighlightEvent(
                highlightId,
                request.fileHash(),
                userId,
                request.content(),
                request.type()
            );
            kafkaTemplate.send("highlight.created", String.valueOf(highlightId), event);

        } catch (Exception e) {
            log.error("⚠️ Falha no envio Kafka: {}", e.getMessage());
        }
        
        return ResponseEntity.status(HttpStatus.CREATED).body(highlightId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteHighlight(@PathVariable Long id) {
        if (userHighlightRepository.existsById(id)) {
            userHighlightRepository.deleteById(id);
            
           
            try {
                kafkaTemplate.send("data.deleted", "HIGHLIGHT:" + id);
                log.info("🗑️ Evento de deleção enviado para Highlight {}", id);
            } catch (Exception e) {
                log.error("Erro ao enviar evento de deleção", e);
            }
        }
    }
}