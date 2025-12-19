package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.Highlight;
import com.ai.organizer.library.repository.HighlightRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/library")
@CrossOrigin(origins = "*") // Permite o Vite acessar (CORS)
@RequiredArgsConstructor
public class LibraryController {

    private final HighlightRepository highlightRepository;
    private final ObjectMapper objectMapper;

    // Endpoint 1: A Estante de Livros (Shelf)
    @GetMapping("/books")
    public List<Map<String, Object>> getMyBooks(@RequestHeader(value = "X-User-ID", defaultValue = "senior-dev") String userId) {
        // Transforma a query bruta em um DTO bonitinho para o Frontend
        List<Object[]> results = highlightRepository.findBooksByUserId(userId);
        
        return results.stream().map(record -> Map.of(
            "id", record[0],
            "title", "Documento " + record[0].toString().substring(0, 8), // Simula título
            "preview", record[1].toString().substring(0, Math.min(50, record[1].toString().length())) + "...",
            "highlightsCount", record[2],
            "lastRead", record[3]
        )).collect(Collectors.toList());
    }

    // Endpoint 2: Detalhes de um Livro (Todas as notas dele)
    @GetMapping("/books/{fileHash}/highlights")
    public List<Highlight> getBookHighlights(@PathVariable String fileHash) {
        // Na prática, buscaríamos por fileHash. 
        // Como o JPA padrão não tem findByFileHash, vamos usar um findAll e filtrar (MVP)
        // Em prod, criaríamos o método no repository.
        return highlightRepository.findAll().stream()
                .filter(h -> h.getFileHash().equals(fileHash))
                .collect(Collectors.toList());
    }
}