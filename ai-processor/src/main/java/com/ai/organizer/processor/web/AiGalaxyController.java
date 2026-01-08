package com.ai.organizer.processor.web;

import com.ai.organizer.processor.web.dto.GravityResponse;

import dev.langchain4j.data.document.Metadata;
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
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai/galaxy")
@RequiredArgsConstructor
@Slf4j
public class AiGalaxyController {

    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;

    @PostMapping("/gravity")
    public GravityResponse calculateGravity(
            @RequestBody String term,
            @RequestHeader(value = "X-User-Id", required = false) String userId
    ) {
        log.info("🪐 [DEBUG] Calculando gravidade para: '{}'", term);

        try {
            Response<Embedding> embeddingResponse = embeddingModel.embed(term);
            
            EmbeddingSearchRequest request = EmbeddingSearchRequest.builder()
                    .queryEmbedding(embeddingResponse.content())
                    .maxResults(100) 
                    .minScore(0.35) 
                    .build();

            EmbeddingSearchResult<TextSegment> result = embeddingStore.search(request);

            List<GravityResponse.StarMatch> matches = result.matches().stream()
                    // Filtra matches vazios ou corrompidos
                    .filter(m -> m.embedded() != null && m.embedded().metadata() != null)
                    .map(this::toMatch)
                    // Filtra IDs nulos
                    .filter(m -> m.highlightId() != null)
                    .collect(Collectors.toList());

            log.info("🧲 Sucesso. Retornando {} conexões válidas.", matches.size());
            
            return new GravityResponse(term, matches);

        } catch (Exception e) {
            log.error("❌ ERRO NO AI PROCESSOR:", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro na IA: " + e.getMessage());
        }
    }

    // --- CORREÇÃO AQUI ---
    private GravityResponse.StarMatch toMatch(EmbeddingMatch<TextSegment> match) {
        String starId = null;
        String textContent = "";

        if (match.embedded() != null) {
            textContent = match.embedded().text(); // Pega o texto do vetor
            
            if (match.embedded().metadata() != null) {
                String hId = match.embedded().metadata().getString("highlightId");
                String sId = match.embedded().metadata().getString("summaryId");
                String dbId = match.embedded().metadata().getString("dbId");

                if (sId != null) {
                    starId = "summary-" + sId;
                } else if (hId != null) {
                    starId = hId;
                } else if (dbId != null) {
                    starId = dbId;
                }
            }
        }
        
        // Passa os 3 argumentos agora: ID, Score, Texto
        return new GravityResponse.StarMatch(starId, match.score(), textContent);
    }

    @PostMapping("/register")
    public void registerGalaxy(@RequestBody RegisterGalaxyRequest request) {
        log.info("🪐 Indexando nova galáxia no Pinecone: {}", request.name());
        
        var embedding = embeddingModel.embed(request.name()).content();
        
        Metadata metadata = Metadata.from("userId", request.userId())
                .put("type", "galaxy") 
                .put("galaxyId", request.id()); 

        TextSegment segment = TextSegment.from(request.name(), metadata);
        embeddingStore.add(embedding, segment);
    }

    public record RegisterGalaxyRequest(String id, String name, String userId) {}
}