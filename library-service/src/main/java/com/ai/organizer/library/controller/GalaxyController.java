
package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.Document;
import com.ai.organizer.library.domain.UserHighlight;
import com.ai.organizer.library.dto.StarDTO;
import com.ai.organizer.library.repository.DocumentRepository;
import com.ai.organizer.library.repository.UserHighlightRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/galaxy")
@RequiredArgsConstructor
@Slf4j
public class GalaxyController {

    private final UserHighlightRepository highlightRepository;
    private final DocumentRepository documentRepository;

    @GetMapping("/stars")
    public List<StarDTO> getMyStars(@AuthenticationPrincipal Jwt jwt) {
        // CORREÇÃO: Extração do ID em uma variável "effectively final"
        final String userId = extractUserId(jwt);

        // 1. Busca todos os highlights do usuário
        List<UserHighlight> highlights = highlightRepository.findAll().stream()
                // Agora o compilador aceita, pois userId nunca muda após a inicialização
                .filter(h -> h.getUserId().equals(userId))
                .toList();

        // 2. Mapa de Títulos
        Map<String, String> titleMap = documentRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .collect(Collectors.toMap(Document::getFileHash, Document::getTitle, (a, b) -> a));

        // 3. Monta o DTO
        return highlights.stream().map(h -> new StarDTO(
                String.valueOf(h.getId()),
                h.getContent(),
                h.getFileHash(),
                titleMap.getOrDefault(h.getFileHash(), "Documento Desconhecido"),
                h.getCreatedAt(),
                h.getType(), userId
        )).collect(Collectors.toList());
    }

    // Helper method para limpar o código e resolver o problema do escopo
    private String extractUserId(Jwt jwt) {
        String claimId = jwt.getClaimAsString("preferred_username");
        return (claimId != null) ? claimId : jwt.getSubject();
    }
}