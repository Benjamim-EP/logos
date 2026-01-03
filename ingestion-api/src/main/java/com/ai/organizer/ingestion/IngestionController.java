package com.ai.organizer.ingestion;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import com.ai.organizer.ingestion.dto.UrlIngestionRequest;

import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/ingestion")
public class IngestionController {


    private final IngestionService service;

    public IngestionController(IngestionService service) {
        this.service = service;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Mono<String> upload(
            @RequestPart("file") FilePart file,
            // CORREÇÃO SÊNIOR: Não lemos mais Header manual. Injetamos o JWT.
            @AuthenticationPrincipal Jwt jwt
    ) {
        // Extraímos o ID real do usuário do token (campo 'sub' é o ID único)
        // Se quiser o email/username, use jwt.getClaimAsString("preferred_username")
        String userId = jwt.getClaimAsString("preferred_username"); 
        
        // Logs de auditoria (opcional)
        System.out.println("🔐 Upload autenticado por: " + userId);

        return service.processUpload(file, userId)
                .doOnSuccess(hash -> System.out.println("✅ Upload concluído. Hash: " + hash))
                .doOnError(e -> System.err.println("❌ Erro no upload: " + e.getMessage()));
    }

    @PostMapping("/url")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Mono<String> uploadFromUrl(
            @RequestBody UrlIngestionRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        // Extrai o usuário do token (Keycloak)
        String userId = jwt.getClaimAsString("preferred_username");
        if (userId == null) userId = jwt.getSubject();

        System.out.println("⬇️ Ingestão URL solicitada por: " + userId + " | Doc: " + request.title());

        return service.processUrlUpload(request, userId)
                .doOnSuccess(hash -> System.out.println("✅ Processo iniciado com sucesso. Hash: " + hash));
    }
}