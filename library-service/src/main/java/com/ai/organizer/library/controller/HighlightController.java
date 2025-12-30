package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.ContentType;
import com.ai.organizer.library.domain.Highlight;
import com.ai.organizer.library.domain.ProcessingStatus;
import com.ai.organizer.library.event.HighlightEvent;
import com.ai.organizer.library.repository.HighlightRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/library/highlights")
@RequiredArgsConstructor
public class HighlightController {

    private final HighlightRepository highlightRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    // DTO de Entrada
    record CreateHighlightRequest(String fileHash, String content, String type) {}

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void createHighlight(
            @RequestBody CreateHighlightRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getClaimAsString("preferred_username");

        // 1. Salvar no Banco (Pattern: Transactional Outbox simplificado)
        Highlight highlight = new Highlight();
        highlight.setFileHash(request.fileHash);
        highlight.setUserId(userId);
        highlight.setOriginalText(request.content);
        highlight.setType(ContentType.valueOf(request.type)); // "TEXT" ou "IMAGE"
        highlight.setStatus(ProcessingStatus.PENDING);
        
        Highlight saved = highlightRepository.save(highlight);

        // 2. Disparar Evento para o Kafka (Assíncrono)
        HighlightEvent event = new HighlightEvent(
            saved.getId(),
            saved.getFileHash(),
            saved.getUserId(),
            saved.getOriginalText(),
            saved.getType().name()
        );

        // Tópico novo: "highlight.created"
        kafkaTemplate.send("highlight.created", saved.getId().toString(), event);
        
        System.out.println("✅ Highlight salvo e evento disparado: " + saved.getId());
    }
}