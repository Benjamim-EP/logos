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
import dev.langchain4j.store.embedding.filter.Filter;
import dev.langchain4j.store.embedding.filter.MetadataFilterBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai/galaxy")
@Slf4j
public class AiGalaxyController {

    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;
    private final EmbeddingStore<TextSegment> publicEmbeddingStore;

    public AiGalaxyController(
            EmbeddingModel embeddingModel,
            @Qualifier("userEmbeddingStore") EmbeddingStore<TextSegment> embeddingStore,
            @Qualifier("publicEmbeddingStore") EmbeddingStore<TextSegment> publicEmbeddingStore) {
        this.embeddingModel = embeddingModel;
        this.embeddingStore = embeddingStore;
        this.publicEmbeddingStore = publicEmbeddingStore;
    }

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
                    
                    .filter(m -> m.embedded() != null && m.embedded().metadata() != null)
                    .map(this::toMatch)

                    .filter(m -> m.highlightId() != null)
                    .collect(Collectors.toList());

            log.info("🧲 Sucesso. Retornando {} conexões válidas.", matches.size());
            
            return new GravityResponse(term, matches);

        } catch (Exception e) {
            log.error("❌ ERRO NO AI PROCESSOR:", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro na IA: " + e.getMessage());
        }
    }

    private GravityResponse.StarMatch toTourMatch(EmbeddingMatch<TextSegment> match) {
        String text = "Texto indisponível";
        if (match.embedded() != null && match.embedded().metadata() != null) {
            String rawText = match.embedded().metadata().getString("text");
            String ref = match.embedded().metadata().getString("ref");
            if (rawText != null) {
                text = (ref != null) ? ref + " - " + rawText : rawText;
            }
        }
        return new GravityResponse.StarMatch(match.embeddingId(), 1.0, text);
    }
    
    @GetMapping("/tour/{universe}/{lang}")
    public List<GravityResponse.StarMatch> getTourUniverse(
            @PathVariable String universe,
            @PathVariable String lang
    ) {
        log.info("🌌 [TOUR] Carregando universo: '{}' | Idioma: '{}'", universe, lang);

        try {
             float[] dummyVector = new float[1536]; 
            for (int i = 0; i < dummyVector.length; i++) {
                dummyVector[i] = (float) Math.random(); // Preenche com ruído aleatório
            }

            Filter filter = MetadataFilterBuilder
                    .metadataKey("universe").isEqualTo(universe)
                    .and(MetadataFilterBuilder.metadataKey("lang").isEqualTo(lang));

            log.info("🔎 Buscando no Pinecone [Index: universes]...");

            EmbeddingSearchRequest request = EmbeddingSearchRequest.builder()
                    .queryEmbedding(dev.langchain4j.data.embedding.Embedding.from(dummyVector))
                    .filter(filter) 
                    .maxResults(200)
                    .minScore(0.0)
                    .build();

            EmbeddingSearchResult<TextSegment> result = publicEmbeddingStore.search(request);
            
            log.info("✅ Pinecone retornou {} itens.", result.matches().size());

            return result.matches().stream()
                    .map(this::toTourMatch)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("❌ Erro ao carregar tour. Verifique a conexão ou chaves.", e);
            return List.of();
        }
    }
    private GravityResponse.StarMatch toMatch(EmbeddingMatch<TextSegment> match) {
        String starId = null;
        String textContent = "";

        if (match.embedded() != null) {
            textContent = match.embedded().text(); 
            
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