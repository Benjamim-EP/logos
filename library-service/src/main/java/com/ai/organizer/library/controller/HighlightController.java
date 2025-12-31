package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.UserHighlight;
import com.ai.organizer.library.event.HighlightEvent;
import com.ai.organizer.library.repository.UserHighlightRepository; // <--- Import Novo
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

    // Injetamos o NOVO repositório
    private final UserHighlightRepository userHighlightRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    // DTO de Entrada (O que o React envia)
    public record CreateHighlightRequest(String fileHash, String content, String type) {}

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void createHighlight(
            @RequestBody CreateHighlightRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getClaimAsString("preferred_username");
        log.info("Recebendo highlight do usuário: {} para o arquivo: {}", userId, request.fileHash());

        // 1. Salvar na NOVA tabela (que permite múltiplos registros)
        UserHighlight hl = new UserHighlight();
        hl.setFileHash(request.fileHash);
        hl.setUserId(userId);
        // Limita tamanho para não quebrar o banco se for muito grande
        hl.setContent(request.content.length() > 3900 ? request.content.substring(0, 3900) : request.content);
        hl.setType(request.type);
        
        UserHighlight saved = userHighlightRepository.save(hl);
        log.info("💾 Highlight salvo no banco USER_HIGHLIGHTS com ID: {}", saved.getId());

        // 2. Disparar Evento para o Kafka (Para o AI Processor pegar e vetorizar)
        HighlightEvent event = new HighlightEvent(
            saved.getId(),
            saved.getFileHash(),
            saved.getUserId(),
            saved.getContent(),
            saved.getType()
        );

        // Envia para o tópico que o AI Processor está escutando
        kafkaTemplate.send("highlight.created", saved.getId().toString(), event);
        log.info("🚀 Evento highlight.created disparado!");
    }
}