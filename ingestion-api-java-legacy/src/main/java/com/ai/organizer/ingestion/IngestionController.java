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
            @RequestHeader(name = "Accept-Language", defaultValue = "en") String lang, // <--- CAPTURA O HEADER
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = jwt.getClaimAsString("preferred_username"); 
        return service.processUpload(file, userId, lang); // <--- PASSA PARA O SERVICE
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