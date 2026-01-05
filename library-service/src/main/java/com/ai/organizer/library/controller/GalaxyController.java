package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.Document;
import com.ai.organizer.library.domain.UserHighlight;
import com.ai.organizer.library.domain.UserSummary; // <--- Import
import com.ai.organizer.library.dto.StarDTO;
import com.ai.organizer.library.repository.DocumentRepository;
import com.ai.organizer.library.repository.UserHighlightRepository;
import com.ai.organizer.library.repository.UserSummaryRepository; // <--- Import
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/galaxy")
@RequiredArgsConstructor
@Slf4j
public class GalaxyController {

    private final UserHighlightRepository highlightRepository;
    private final UserSummaryRepository summaryRepository; // <--- Injeção Nova
    private final DocumentRepository documentRepository;

    @GetMapping("/stars")
    public List<StarDTO> getMyStars(@AuthenticationPrincipal Jwt jwt) {
        final String userId = extractUserId(jwt);

        // 1. Mapa de Títulos (Cache rápido)
        Map<String, String> titleMap = documentRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .collect(Collectors.toMap(Document::getFileHash, Document::getTitle, (a, b) -> a));

        List<StarDTO> stars = new ArrayList<>();

        // 2. Busca Highlights (Estrelas Normais)
        List<UserHighlight> highlights = highlightRepository.findAll().stream()
                .filter(h -> h.getUserId().equals(userId))
                .toList();

        stars.addAll(highlights.stream().map(h -> new StarDTO(
                String.valueOf(h.getId()),
                h.getContent(),
                h.getFileHash(),
                titleMap.getOrDefault(h.getFileHash(), "Documento Desconhecido"),
                h.getCreatedAt(),
                h.getType(),
                h.getPositionJson()
        )).toList());

        // 3. Busca Resumos (Estrelas Especiais - "Resumes")
        List<UserSummary> summaries = summaryRepository.findByUserId(userId);

        stars.addAll(summaries.stream().map(s -> new StarDTO(
                "summary-" + s.getId(), // Prefixo para evitar colisão de ID
                "Resumo IA: " + (s.getGeneratedText() != null ? s.getGeneratedText().substring(0, Math.min(50, s.getGeneratedText().length())) + "..." : "Gerando..."),
                s.getFileHash(),
                titleMap.getOrDefault(s.getFileHash(), "Documento"),
                s.getCreatedAt(),
                "RESUME", // <--- TIPO ESPECIAL
                null // Resumos não têm posição no PDF
        )).toList());

        return stars;
    }

    private String extractUserId(Jwt jwt) {
        String claimId = jwt.getClaimAsString("preferred_username");
        return (claimId != null) ? claimId : jwt.getSubject();
    }
}