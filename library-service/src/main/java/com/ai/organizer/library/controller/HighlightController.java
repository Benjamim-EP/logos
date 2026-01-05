// library-service/src/main/java/com/ai/organizer/library/controller/HighlightController.java

package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.UserHighlight;
import com.ai.organizer.library.event.HighlightEvent;
import com.ai.organizer.library.repository.UserHighlightRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
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

    // DTO Atualizado: Agora recebe position (JSON String)
    public record CreateHighlightRequest(
        String fileHash, 
        String content, 
        String type, 
        String position // <--- NOVO
    ) {}

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void createHighlight(
            @RequestBody CreateHighlightRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getClaimAsString("preferred_username");
        log.info("Recebendo highlight do usuário: {} para o arquivo: {}", userId, request.fileHash());

        UserHighlight hl = new UserHighlight();
        hl.setFileHash(request.fileHash);
        hl.setUserId(userId);
        hl.setContent(request.content.length() > 3900 ? request.content.substring(0, 3900) : request.content);
        hl.setType(request.type);
        hl.setPositionJson(request.position); // <--- SALVA A POSIÇÃO
        
        UserHighlight saved = userHighlightRepository.save(hl);
        log.info("💾 Highlight salvo com posição. ID: {}", saved.getId());

        // O evento Kafka continua igual (o AI Processor não precisa da posição visual, só do texto)
        HighlightEvent event = new HighlightEvent(
            saved.getId(),
            saved.getFileHash(),
            saved.getUserId(),
            saved.getContent(),
            saved.getType()
        );

        kafkaTemplate.send("highlight.created", saved.getId().toString(), event);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteHighlight(@PathVariable Long id) {
        if (userHighlightRepository.existsById(id)) {
            userHighlightRepository.deleteById(id);
            // Formato da mensagem: "TIPO:ID"
            kafkaTemplate.send("data.deleted", "HIGHLIGHT:" + id);
            log.info("🗑️ Highlight {} deletado.", id);
        }
    }
}