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
    public record TourGravityRequest(String term, String universe, String lang) {}

    public AiGalaxyController(
            EmbeddingModel embeddingModel,
            @Qualifier("userEmbeddingStore") EmbeddingStore<TextSegment> embeddingStore,
            @Qualifier("publicEmbeddingStore") EmbeddingStore<TextSegment> publicEmbeddingStore) {
        this.embeddingModel = embeddingModel;
        this.embeddingStore = embeddingStore;
        this.publicEmbeddingStore = publicEmbeddingStore;
    }
    @PostMapping("/tour/gravity")
    public GravityResponse calculateTourGravity(@RequestBody TourGravityRequest request) {
        log.info("🪐 [TOUR GRAVITY] Calculando atração para: '{}' em {}/{}", request.term(), request.universe(), request.lang());

        try {
            Response<Embedding> embeddingResponse = embeddingModel.embed(request.term());

            Filter filter = MetadataFilterBuilder
                    .metadataKey("universe").isEqualTo(request.universe())
                    .and(MetadataFilterBuilder.metadataKey("lang").isEqualTo(request.lang()));

            EmbeddingSearchRequest searchRequest = EmbeddingSearchRequest.builder()
                    .queryEmbedding(embeddingResponse.content())
                    .filter(filter)
                    .minScore(0.35)
                    .maxResults(50)
                    .build();

            EmbeddingSearchResult<TextSegment> result = publicEmbeddingStore.search(searchRequest);
            
            log.info("🧲 Atração detectada: {} estrelas movidas.", result.matches().size());

            List<GravityResponse.StarMatch> matches = result.matches().stream()
                    .map(this::toTourMatch).collect(Collectors.toList());

            return new GravityResponse(request.term(), matches);

        } catch (Exception e) {
            log.error("Erro na gravidade do tour", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro ao calcular gravidade");
        }
    }

    private GravityResponse.StarMatch toTourMatch(EmbeddingMatch<TextSegment> match) {
        String textContent = "Texto indisponível";
        
        if (match != null && match.embedded() != null && match.embedded().metadata() != null) {
            var metaMap = match.embedded().metadata().asMap();
            
            // --- DEBUG AGRESSIVO (PARA DESCOBRIR A CHAVE) ---
            log.info("🚨 [DEBUG PINECONE] ID: {} | CHAVES: {}", match.embeddingId(), metaMap.keySet());
            log.info("🚨 [DEBUG PINECONE] DADOS COMPLETOS: {}", metaMap);
            // ------------------------------------------------

            // 1. Tentativa de Força Bruta para achar o texto
            if (metaMap.containsKey("text")) textContent = metaMap.get("text").toString();
            else if (metaMap.containsKey("Text")) textContent = metaMap.get("Text").toString();
            else if (metaMap.containsKey("content")) textContent = metaMap.get("content").toString();
            else if (metaMap.containsKey("text_segment")) textContent = metaMap.get("text_segment").toString();
            else if (metaMap.containsKey("verse_text")) textContent = metaMap.get("verse_text").toString();
            
            // 2. Monta referência (Gênesis 1:1)
            String ref = "";
            if (metaMap.containsKey("ref")) {
                ref = metaMap.get("ref").toString();
            } else if (metaMap.containsKey("book") && metaMap.containsKey("chapter") && metaMap.containsKey("verse")) {
                ref = String.format("%s %s:%s", 
                    metaMap.get("book"), 
                    metaMap.get("chapter"), 
                    metaMap.get("verse")
                );
            }

            // 3. Formatação Final
            if (!ref.isEmpty() && !"Texto indisponível".equals(textContent)) {
                // Evita duplicar se o texto já começar com "Gênesis 1:1..."
                if (!textContent.startsWith(ref)) {
                    textContent = ref + " - " + textContent;
                }
            }
        }
        
        // 4. Última tentativa: Pegar do corpo do segmento (caso o LangChain tenha movido)
        if ("Texto indisponível".equals(textContent) && match != null && match.embedded() != null) {
             if (match.embedded().text() != null && !match.embedded().text().isBlank()) {
                 textContent = match.embedded().text();
             }
        }

        return new GravityResponse.StarMatch(match.embeddingId(), 1.0, textContent);
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
                dummyVector[i] = (float) Math.random(); 
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