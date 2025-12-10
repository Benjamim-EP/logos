package com.ai.organizer.ingestion;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.*;
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
    public Mono<String> upload(@RequestPart("file") FilePart file, 
                               @RequestHeader(value = "X-User-ID", defaultValue = "guest") String userId) {
        
        // Retorna o Hash do arquivo como confirmação
        return service.processUpload(file, userId)
                .doOnSuccess(hash -> System.out.println("✅ Upload concluído. Hash: " + hash))
                .doOnError(e -> System.err.println("❌ Erro no upload: " + e.getMessage()));
    }
}