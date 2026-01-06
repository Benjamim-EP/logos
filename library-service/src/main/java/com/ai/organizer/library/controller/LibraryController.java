package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.Document;
import com.ai.organizer.library.domain.Highlight;
import com.ai.organizer.library.domain.UserHighlight;
import com.ai.organizer.library.repository.DocumentRepository;
import com.ai.organizer.library.repository.HighlightRepository;
import com.ai.organizer.library.repository.UserHighlightRepository;
import com.ai.organizer.library.service.BlobStorageService; // <--- Interface copiada do ingestion/ai-processor
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
    private final BlobStorageService blobStorageService; // <--- Injeção do Serviço de Storage

    /**
     * Endpoint 1: A Estante de Livros (Shelf)
     * Retorna a lista de documentos salvos no banco.
     */
    @GetMapping("/books")
    public List<Map<String, Object>> getMyBooks(@AuthenticationPrincipal Jwt jwt) {
        String userId = extractUserId(jwt);
        List<Document> docs = documentRepository.findByUserIdOrderByCreatedAtDesc(userId);

        return docs.stream().map(doc -> {
            String coverUrl = null;
            // Gera URL assinada on-the-fly (rápido, operação local de crypto)
            if (doc.getCoverPath() != null) {
                coverUrl = blobStorageService.getSignedUrl(doc.getCoverPath(), 60).toString();
            }

            return Map.<String, Object>of(
                "id", doc.getFileHash(),
                "title", doc.getTitle(),
                "preview", "Importado em " + (doc.getCreatedAt() != null ? doc.getCreatedAt().toLocalDate() : "N/A"),
                "coverUrl", coverUrl != null ? coverUrl : "", // <--- CAMPO NOVO
                "highlightsCount", 0,
                "lastRead", doc.getCreatedAt() != null ? doc.getCreatedAt() : java.time.LocalDateTime.now()
            );
        }).collect(Collectors.toList());
    }

    /**
     * Endpoint 2: Detalhes dos Highlights de um Livro
     * Usado quando o usuário abre o livro para ver suas marcações passadas.
     */
    @GetMapping("/books/{fileHash}/highlights")
    public List<UserHighlight> getBookHighlights(
            @PathVariable String fileHash, 
            @AuthenticationPrincipal Jwt jwt) {
        
        String userId = extractUserId(jwt);
        
        // Usa o método do novo repositório
        return userHighlightRepository.findByUserIdAndFileHash(userId, fileHash);
    }

    /**
     * Endpoint 3: Obter URL de Leitura (Signed URL) - NOVO
     * Gera um link temporário para o Frontend baixar o PDF direto do Google Cloud.
     */
    @GetMapping("/books/{fileHash}/content")
    public Map<String, String> getBookContentUrl(
            @PathVariable String fileHash,
            @AuthenticationPrincipal Jwt jwt) {
        
        // 1. Busca o documento para pegar o caminho (storagePath)
        Document doc = documentRepository.findByFileHash(fileHash)
                .orElseThrow(() -> new RuntimeException("Documento não encontrado na estante."));

        // 2. Validação de Segurança (Opcional, mas recomendada)
        String userId = extractUserId(jwt);
        if (!doc.getUserId().equals(userId)) {
             log.warn("⚠️ Usuário {} tentou acessar documento de outro usuário ({})", userId, doc.getUserId());
             // throw new AccessDeniedException("Você não tem permissão para ler este livro.");
        }

        // 3. Verifica se o caminho do storage existe no banco
        if (doc.getStoragePath() == null || doc.getStoragePath().isEmpty()) {
            throw new RuntimeException("Caminho do arquivo não encontrado no registro do documento.");
        }

        // 4. Gera URL assinada válida por 60 minutos
        URL signedUrl = blobStorageService.getSignedUrl(doc.getStoragePath(), 60);
        
        log.info("📖 URL de leitura gerada para: {} (Expira em 60m)", doc.getTitle());
        
        return Map.of(
            "url", signedUrl.toString(),
            "type", "application/pdf"
        );
    }

    /**
     * Helper para extrair ID do usuário do Token JWT de forma consistente
     */
    private String extractUserId(Jwt jwt) {
        String claim = jwt.getClaimAsString("preferred_username");
        return claim != null ? claim : jwt.getSubject();
    }

    @GetMapping("/books/{fileHash}/cover")
    public Map<String, String> getBookCoverUrl(@PathVariable String fileHash) {
        
        // 1. Busca documento
        Document doc = documentRepository.findByFileHash(fileHash)
                .orElseThrow(() -> new RuntimeException("Documento não encontrado"));

        // 2. Se não tiver capa, retorna null (Frontend usa placeholder)
        if (doc.getCoverPath() == null) {
            return Map.of("url", ""); 
        }

        // 3. Gera URL assinada (60 min)
        URL signedUrl = blobStorageService.getSignedUrl(doc.getCoverPath(), 60);
        
        return Map.of("url", signedUrl.toString());
    }
}