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
import dev.langchain4j.store.embedding.filter.Filter;
import dev.langchain4j.store.embedding.filter.MetadataFilterBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai/galaxy")
@Slf4j
public class AiGalaxyController {

    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;       // Logos (User)
    private final EmbeddingStore<TextSegment> publicEmbeddingStore; // Universes (Bíblia)
    private final EmbeddingStore<TextSegment> guestEmbeddingStore;  // Guest Data (Novo)

    // DTO para o Request do Tour
    public record TourGravityRequest(String term, String universe, String lang) {}
    public record RegisterGalaxyRequest(String id, String name, String userId) {}

    // --- CONSTRUTOR COM INJEÇÃO ---
    public AiGalaxyController(
            EmbeddingModel embeddingModel,
            @Qualifier("userEmbeddingStore") EmbeddingStore<TextSegment> embeddingStore,
            @Qualifier("publicEmbeddingStore") EmbeddingStore<TextSegment> publicEmbeddingStore,
            @Qualifier("guestEmbeddingStore") EmbeddingStore<TextSegment> guestEmbeddingStore // <--- INJEÇÃO AQUI
    ) {
        this.embeddingModel = embeddingModel;
        this.embeddingStore = embeddingStore;
        this.publicEmbeddingStore = publicEmbeddingStore;
        this.guestEmbeddingStore = guestEmbeddingStore;
    }

    // --- ENDPOINT NOVO: Buscar estrelas do Guest ---
    @GetMapping("/guest-stars")
    public List<GravityResponse.StarMatch> getGuestStars(@RequestHeader("X-User-Id") String guestId) {
        log.info("👻 Buscando estrelas do visitante: {}", guestId);
        try {
            // Cria vetor aleatório para busca (pois precisamos filtrar por metadados)
            float[] dummyVector = new float[1536];
            for(int i=0;i<1536;i++) dummyVector[i]=(float)Math.random();
            Filter userFilter = MetadataFilterBuilder.metadataKey("userId").isEqualTo(guestId);

            // Filtra pelo ID do visitante no índice guest-data
            EmbeddingSearchRequest request = EmbeddingSearchRequest.builder()
                    .queryEmbedding(dev.langchain4j.data.embedding.Embedding.from(dummyVector))
                    .filter(userFilter)
                    .maxResults(100)
                    .minScore(0.0)
                    .build();

            // Usa o guestStore
            return guestEmbeddingStore.search(request).matches().stream()
                    .map(this::toTourMatch)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Erro ao buscar guest stars", e);
            return List.of();
        }
    }

    @PostMapping("/tour/gravity")
    public GravityResponse calculateTourGravity(@RequestBody TourGravityRequest request) {
        log.info("🪐 [TOUR GRAVITY] Calculando atração para: '{}'", request.term());

        try {
            Response<Embedding> embeddingResponse = embeddingModel.embed(request.term());
            
            EmbeddingStore<TextSegment> targetStore;
            Filter filter = null;

            // Seleção de Store (Lógica mantida)
            if (request.universe() == null || "none".equals(request.universe())) {
                targetStore = guestEmbeddingStore;
                // Filtra pelo guestId se enviado, senão busca em tudo do guest-data (como é efêmero, ok)
                // Se quiser ser estrito: filter = MetadataFilterBuilder.metadataKey("userId").isEqualTo(guestUserId);
            } else {
                targetStore = publicEmbeddingStore;
                filter = MetadataFilterBuilder
                        .metadataKey("universe").isEqualTo(request.universe())
                        .and(MetadataFilterBuilder.metadataKey("lang").isEqualTo(request.lang()));
            }

            EmbeddingSearchRequest searchRequest = EmbeddingSearchRequest.builder()
                    .queryEmbedding(embeddingResponse.content())
                    .filter(filter)
                    // --- AQUI ESTÁ A CORREÇÃO ---
                    .minScore(0.60) // Aumentamos a exigência. Só retorna se for semanticamente próximo.
                    .maxResults(50)
                    .build();

            EmbeddingSearchResult<TextSegment> result = targetStore.search(searchRequest);
            
            // Log para você ver se funcionou
            log.info("🧲 Termo '{}' atraiu {} estrelas (Score > 0.60).", request.term(), result.matches().size());

            List<GravityResponse.StarMatch> matches = result.matches().stream()
                    .map(this::toTourMatch)
                    .collect(Collectors.toList());

            return new GravityResponse(request.term(), matches);

        } catch (Exception e) {
            log.error("Erro na gravidade", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro ao calcular gravidade");
        }
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
                    //.filter(filter) 
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

    private GravityResponse.StarMatch toTourMatch(EmbeddingMatch<TextSegment> match) {
        String textContent = "Texto indisponível";
        
        if (match != null && match.embedded() != null && match.embedded().metadata() != null) {
            var metaMap = match.embedded().metadata().asMap();
            
            // Tenta pegar o texto (Case Insensitive)
            if (metaMap.containsKey("text")) textContent = metaMap.get("text").toString();
            else if (metaMap.containsKey("Text")) textContent = metaMap.get("Text").toString();
            else if (metaMap.containsKey("content")) textContent = metaMap.get("content").toString();
            else if (metaMap.containsKey("text_segment")) textContent = metaMap.get("text_segment").toString();
            else if (metaMap.containsKey("verse_text")) textContent = metaMap.get("verse_text").toString();
            
            // Monta referência (Gênesis 1:1)
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

            if (!ref.isEmpty() && !"Texto indisponível".equals(textContent)) {
                if (!textContent.startsWith(ref)) {
                    textContent = ref + " - " + textContent;
                }
            }
        }
        
        // Última tentativa: Pegar do corpo do segmento
        if ("Texto indisponível".equals(textContent) && match != null && match.embedded() != null) {
             if (match.embedded().text() != null && !match.embedded().text().isBlank()) {
                 textContent = match.embedded().text();
             }
        }

        return new GravityResponse.StarMatch(match.embeddingId(), 1.0, textContent);
    }
    
    @PostMapping("/gravity")
    public GravityResponse calculateGravity(
            @RequestBody String term,
            @RequestHeader(value = "X-User-Id", required = false) String userId // <--- Pegar do Header
    ) {
        if (userId == null) {
            log.warn("⚠️ Gravidade solicitada sem User ID. Resultados podem ser imprecisos.");
        }

        log.info("🪐 Calculando gravidade para Galáxia '{}' (User: {})", term, userId);

        try {
            Response<Embedding> embeddingResponse = embeddingModel.embed(term);
            
            Filter filter = MetadataFilterBuilder.metadataKey("userId").isEqualTo(userId)
                    .and(MetadataFilterBuilder.metadataKey("type").isEqualTo("highlight")); // Só atrai highlights, não outras galáxias

            EmbeddingSearchRequest request = EmbeddingSearchRequest.builder()
                    .queryEmbedding(embeddingResponse.content())
                    .filter(filter) 
                    .maxResults(50) 
                    .minScore(0.60) 
                    .build();

           EmbeddingSearchResult<TextSegment> result = embeddingStore.search(request);

            List<GravityResponse.StarMatch> matches = result.matches().stream()
                    .filter(m -> m.embedded() != null && m.embedded().metadata() != null)
                    .map(this::toMatch) 
                    .collect(Collectors.toList());

            log.info("🧲 Galáxia recém-nascida atraiu {} estrelas existentes.", matches.size());
            
            return new GravityResponse(term, matches);

        } catch (Exception e) {
            log.error("❌ Erro na gravidade", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro na IA");
        }
    }

    @PostMapping("/register")
    public void registerGalaxy(@RequestBody RegisterGalaxyRequest request) {
        log.info("🪐 Indexando nova galáxia no Pinecone: {}", request.name());
        var embedding = embeddingModel.embed(request.name()).content();
        
        dev.langchain4j.data.document.Metadata metadata = dev.langchain4j.data.document.Metadata.from("userId", request.userId())
                .put("type", "galaxy") 
                .put("galaxyId", request.id()); 

        TextSegment segment = TextSegment.from(request.name(), metadata);
        embeddingStore.add(embedding, segment);
    }

    private GravityResponse.StarMatch toMatch(EmbeddingMatch<TextSegment> match) {
        String starId = match.embeddingId(); // Padrão
        String textContent = "";

        if (match.embedded() != null) {
            if (match.embedded().text() != null) {
                textContent = match.embedded().text();
            }
            
            if (match.embedded().metadata() != null) {
                var meta = match.embedded().metadata();
                
                String hId = meta.getString("highlightId");
                String sId = meta.getString("summaryId");
                
                if (sId != null) starId = "summary-" + sId;
                else if (hId != null) starId = hId;
                if (textContent.isEmpty()) {
                    String metaText = meta.getString("text_segment");
                    if (metaText == null) metaText = meta.getString("text");
                    if (metaText != null) textContent = metaText;
                }
            }
        }
        
        return new GravityResponse.StarMatch(starId, match.score(), textContent);
    }
}