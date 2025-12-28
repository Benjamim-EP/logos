package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.Highlight;
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

    /**
     * Endpoint 1: A Estante de Livros (Shelf)
     * Lista os documentos agrupados por Hash, pertencentes apenas ao usuário logado.
     */
    @GetMapping("/books")
    public List<Map<String, Object>> getMyBooks(@AuthenticationPrincipal Jwt jwt) {
        // Extrai o "preferred_username" (ex: seniordev) ou "sub" (ID único) do token Keycloak
        String userId = jwt.getClaimAsString("preferred_username");
        
        if (userId == null) {
            userId = jwt.getSubject(); // Fallback para o ID interno do Keycloak
        }

        log.info("📚 Buscando estante para o usuário autenticado: {}", userId);
        
        // Busca no banco usando a Query personalizada do Repository
        List<Object[]> results = highlightRepository.findBooksByUserId(userId);
        
        // Transforma o Array de Objetos do JPA em um Map JSON amigável para o React
        return results.stream().map(record -> Map.of(
            "id", record[0],
            "title", "Documento " + record[0].toString().substring(0, 8), // Simula título usando parte do Hash
            "preview", record[1] != null 
                ? record[1].toString().substring(0, Math.min(50, record[1].toString().length())) + "..." 
                : "Sem preview",
            "highlightsCount", record[2],
            "lastRead", record[3]
        )).collect(Collectors.toList());
    }

    /**
     * Endpoint 2: Detalhes de um Livro (Todas as notas dele)
     * Retorna os destaques brutos para serem plotados no PDF ou na Galáxia.
     */
    @GetMapping("/books/{fileHash}/highlights")
    public List<Highlight> getBookHighlights(
            @PathVariable String fileHash, 
            @AuthenticationPrincipal Jwt jwt) {
        
        String userId = jwt.getClaimAsString("preferred_username");

        // Regra de Negócio Sênior:
        // Garantir que o usuário só veja os highlights DELE, mesmo que saiba o hash do arquivo.
        // (Em produção, isso seria um método findByFileHashAndUserId no Repository para performance)
        return highlightRepository.findAll().stream()
                .filter(h -> h.getFileHash().equals(fileHash) && h.getUserId().equals(userId))
                .collect(Collectors.toList());
    }
}