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
                    .minScore(0.6) // Voltamos para um score razoável
                    .build();

            EmbeddingSearchResult<TextSegment> result = embeddingStore.search(request);

            // 3. Mapeamento com FILTRAGEM DEFENSIVA (Modern Java in Action - Cap 5: Streams)
            List<GravityResponse.StarMatch> matches = result.matches().stream()
                    // FILTRO CRÍTICO: Só aceita se houver conteúdo embutido (evita o NPE)
                    .filter(m -> m.embedded() != null && m.embedded().metadata() != null)
                    .map(this::toMatch)
                    // Só aceita se conseguimos extrair um ID válido do banco
                    .filter(m -> m.highlightId() != null)
                    .collect(Collectors.toList());

            log.info("🧲 Sucesso. Retornando {} conexões válidas de {} totais do Pinecone.", 
                     matches.size(), result.matches().size());
            
            return new GravityResponse(term, matches);

        } catch (Exception e) {
            log.error("❌ ERRO NO AI PROCESSOR:", e);
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "Erro na IA: " + e.getMessage());
        }
    }

    private GravityResponse.StarMatch toMatch(EmbeddingMatch<TextSegment> match) {
        String starId = null;
        if (match.embedded() != null && match.embedded().metadata() != null) {
            // Tenta pegar de uma das duas fontes possíveis
            String hId = match.embedded().metadata().getString("highlightId");
            String sId = match.embedded().metadata().getString("summaryId");

            if (sId != null) {
                // Se for resumo, mandamos com o prefixo que o frontend já usa
                starId = "summary-" + sId;
            } else if (hId != null) {
                starId = hId;
            }
        }
        return new GravityResponse.StarMatch(starId, match.score());
    }

     @PostMapping("/register")
    public void registerGalaxy(@RequestBody RegisterGalaxyRequest request) {
        log.info("🪐 Indexando nova galáxia no Pinecone: {}", request.name());
        
        // 1. Vetoriza o nome da Galáxia
        var embedding = embeddingModel.embed(request.name()).content();
        
        // 2. Salva com tipo 'galaxy' para ser encontrável
        Metadata metadata = Metadata.from("userId", request.userId())
                .put("type", "galaxy") // <--- TIPO ESPECIAL
                .put("galaxyId", request.id()); // ID do Postgres

        TextSegment segment = TextSegment.from(request.name(), metadata);
        embeddingStore.add(embedding, segment);
    }

    // DTO Interno
    public record RegisterGalaxyRequest(String id, String name, String userId) {}
}