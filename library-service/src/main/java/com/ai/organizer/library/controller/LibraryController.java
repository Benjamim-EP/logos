
package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.Document;
import com.ai.organizer.library.domain.Highlight;
import com.ai.organizer.library.repository.DocumentRepository;
import com.ai.organizer.library.repository.HighlightRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/library")
@RequiredArgsConstructor
@Slf4j
public class LibraryController {

    private final HighlightRepository highlightRepository;
    private final DocumentRepository documentRepository; // Injeção Nova

    /**
     * Endpoint 1: A Estante de Livros (Shelf)
     * Agora busca da tabela DOCUMENTS (Nomes reais!)
     */
    @GetMapping("/books")
    public List<Map<String, Object>> getMyBooks(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getClaimAsString("preferred_username");
        if (userId == null) userId = jwt.getSubject();

        log.info("📚 Buscando estante REAL para o usuário: {}", userId);
        
        // 1. Busca os documentos cadastrados
        List<Document> docs = documentRepository.findByUserIdOrderByCreatedAtDesc(userId);

        // 2. Mapeia para o DTO esperado pelo Frontend
        // (Futuramente podemos fazer um join para contar highlights, mas por enquanto YAGNI)
        return docs.stream().map(doc -> Map.<String, Object>of( // <--- O Pulo do Gato 🐱
            "id", doc.getFileHash(),
            "title", doc.getTitle(),
            "preview", "Documento importado em " + doc.getCreatedAt().toLocalDate(),
            "highlightsCount", 0,
            "lastRead", doc.getCreatedAt()
        )).collect(Collectors.toList());
    }

    /**
     * Endpoint 2: Detalhes (Mantido igual por enquanto)
     */
    @GetMapping("/books/{fileHash}/highlights")
    public List<Highlight> getBookHighlights(
            @PathVariable String fileHash, 
            @AuthenticationPrincipal Jwt jwt) {
        
        String userId = jwt.getClaimAsString("preferred_username");
        return highlightRepository.findByUserId(userId).stream()
                .filter(h -> h.getFileHash().equals(fileHash))
                .collect(Collectors.toList());
    }
}