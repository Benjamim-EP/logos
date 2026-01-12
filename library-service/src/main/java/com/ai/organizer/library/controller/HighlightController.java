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

@RestController
@RequestMapping("/api/library/highlights")
@RequiredArgsConstructor
@Slf4j
public class HighlightController {

    private final UserHighlightRepository userHighlightRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final RadarTriggerService radarTriggerService;

    
    public record CreateHighlightRequest(
        String fileHash, 
        String content, 
        String type, 
        String position 
    ) {}

    @PostMapping
    public ResponseEntity<Long> createHighlight(
            @RequestBody CreateHighlightRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getClaimAsString("preferred_username");
        
        
        UserHighlight hl = new UserHighlight();
        hl.setFileHash(request.fileHash);
        hl.setUserId(userId);
        
        
        String safeContent = request.content != null && request.content.length() > 3900 
                ? request.content.substring(0, 3900) 
                : request.content;
                
        hl.setContent(safeContent);
        hl.setType(request.type);
        hl.setPositionJson(request.position);
        
        
        UserHighlight saved = userHighlightRepository.save(hl);
        log.info("💾 Highlight salvo no SQL. ID: {}", saved.getId());

        
        try {
            
            radarTriggerService.checkAndTrigger(userId);
            
            
            HighlightEvent event = new HighlightEvent(
                saved.getId(),
                saved.getFileHash(),
                saved.getUserId(),
                saved.getContent(),
                saved.getType()
            );
            kafkaTemplate.send("highlight.created", saved.getId().toString(), event);
            
            log.info("🚀 Eventos de integração disparados com sucesso.");

        } catch (Exception e) {
           
            log.error("⚠️ Falha nos eventos secundários (Kafka/Radar): {}", e.getMessage());
        }
        
        
        return ResponseEntity.status(HttpStatus.CREATED).body(saved.getId());
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