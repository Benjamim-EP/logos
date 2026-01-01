
package com.ai.organizer.processor.web;

import com.ai.organizer.processor.web.dto.GravityResponse;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingSearchResult;
import dev.langchain4j.store.embedding.EmbeddingStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai/galaxy")
@RequiredArgsConstructor
@Slf4j
public class AiGalaxyController {

    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;

    /**
     * Calcula a "Gravidade" de um termo para as estrelas do usuário.
     */
    @PostMapping("/gravity")
    public GravityResponse calculateGravity(
            @RequestBody String term,
            @RequestHeader(value = "X-User-Id", required = false) String userId // O Gateway pode injetar ou passamos no body
    ) {
        log.info("🪐 Calculando gravidade para o termo: '{}'", term);

        // 1. Vetoriza o termo de busca (ex: "Arquitetura")
        Response<Embedding> embeddingResponse = embeddingModel.embed(term);
        Embedding queryEmbedding = embeddingResponse.content();

        // 2. Busca no Pinecone (Top 100 mais próximos para performance)
        // Em produção, filtraríamos por metadata 'userId' aqui para não pegar estrelas de outros
        EmbeddingSearchRequest request = EmbeddingSearchRequest.builder()
                .queryEmbedding(queryEmbedding)
                .maxResults(100) 
                .minScore(0.6) // Só traz o que for minimamente relevante
                .build();

        EmbeddingSearchResult<TextSegment> result = embeddingStore.search(request);

        // 3. Mapeia para DTO
        List<GravityResponse.StarMatch> matches = result.matches().stream()
                .map(this::toMatch)
                // Filtra para garantir que temos ID (Defesa)
                .filter(m -> m.highlightId() != null)
                .collect(Collectors.toList());

        log.info("🧲 Encontradas {} estrelas atraídas por '{}'", matches.size(), term);
        
        return new GravityResponse(term, matches);
    }

    private GravityResponse.StarMatch toMatch(EmbeddingMatch<TextSegment> match) {
        // Recupera o ID do banco que salvamos no Metadata na fase de Ingestão
        String dbId = match.embedded() != null ? match.embedded().metadata().getString("highlightId") : null;
        
        // Fallback: Se não tiver highlightId (pode ser um documento inteiro), tenta dbId genérico
        if (dbId == null && match.embedded() != null) {
             dbId = match.embedded().metadata().getString("dbId");
        }

        return new GravityResponse.StarMatch(dbId, match.score());
    }
}