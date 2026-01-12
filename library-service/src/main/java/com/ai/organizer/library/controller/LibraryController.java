package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.Document;
import com.ai.organizer.library.domain.UserHighlight;
import com.ai.organizer.library.repository.DocumentRepository;
import com.ai.organizer.library.repository.UserHighlightRepository;
import com.ai.organizer.library.service.BlobStorageService; 
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.net.URL;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/library")
@RequiredArgsConstructor
@Slf4j
public class LibraryController {

    private final UserHighlightRepository userHighlightRepository;
    private final DocumentRepository documentRepository;
    private final BlobStorageService blobStorageService; 
    
    @GetMapping("/books")
    public List<Map<String, Object>> getMyBooks(@AuthenticationPrincipal Jwt jwt) {
        String userId = extractUserId(jwt);
        List<Document> docs = documentRepository.findByUserIdOrderByCreatedAtDesc(userId);

        return docs.stream().map(doc -> {
            String coverUrl = null;
            
            if (doc.getCoverPath() != null) {
                coverUrl = blobStorageService.getSignedUrl(doc.getCoverPath(), 60).toString();
            }

            return Map.<String, Object>of(
                "id", doc.getFileHash(),
                "title", doc.getTitle(),
                "preview", "Importado em " + (doc.getCreatedAt() != null ? doc.getCreatedAt().toLocalDate() : "N/A"),
                "coverUrl", coverUrl != null ? coverUrl : "", 
                "highlightsCount", 0,
                "lastRead", doc.getCreatedAt() != null ? doc.getCreatedAt() : java.time.LocalDateTime.now()
            );
        }).collect(Collectors.toList());
    }

   
    @GetMapping("/books/{fileHash}/highlights")
    public List<UserHighlight> getBookHighlights(
            @PathVariable String fileHash, 
            @AuthenticationPrincipal Jwt jwt) {
        
        String userId = extractUserId(jwt);
        
        
        return userHighlightRepository.findByUserIdAndFileHash(userId, fileHash);
    }

    
    @GetMapping("/books/{fileHash}/content")
    public Map<String, String> getBookContentUrl(
            @PathVariable String fileHash,
            @AuthenticationPrincipal Jwt jwt) {
        
        
        Document doc = documentRepository.findByFileHash(fileHash)
                .orElseThrow(() -> new RuntimeException("Documento não encontrado na estante."));

        
        String userId = extractUserId(jwt);
        if (!doc.getUserId().equals(userId)) {
             log.warn("⚠️ Usuário {} tentou acessar documento de outro usuário ({})", userId, doc.getUserId());
             
        }

        
        if (doc.getStoragePath() == null || doc.getStoragePath().isEmpty()) {
            throw new RuntimeException("Caminho do arquivo não encontrado no registro do documento.");
        }

       
        URL signedUrl = blobStorageService.getSignedUrl(doc.getStoragePath(), 60);
        
        log.info("📖 URL de leitura gerada para: {} (Expira em 60m)", doc.getTitle());
        
        return Map.of(
            "url", signedUrl.toString(),
            "type", "application/pdf"
        );
    }

    
    private String extractUserId(Jwt jwt) {
        String claim = jwt.getClaimAsString("preferred_username");
        return claim != null ? claim : jwt.getSubject();
    }

    @GetMapping("/books/{fileHash}/cover")
    public Map<String, String> getBookCoverUrl(@PathVariable String fileHash) {
        
        
        Document doc = documentRepository.findByFileHash(fileHash)
                .orElseThrow(() -> new RuntimeException("Documento não encontrado"));

        
        if (doc.getCoverPath() == null) {
            return Map.of("url", ""); 
        }

        
        URL signedUrl = blobStorageService.getSignedUrl(doc.getCoverPath(), 60);
        
        return Map.of("url", signedUrl.toString());
    }
}