package com.ai.organizer.processor.web;

import com.ai.organizer.processor.web.dto.ContextSearchRequest;
import com.ai.organizer.processor.web.dto.GravityResponse;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingSearchResult;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.filter.MetadataFilterBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;
import com.ai.organizer.processor.repository.HighlightRepository;

@RestController
@RequestMapping("/api/ai/workbench")
@RequiredArgsConstructor
@Slf4j
public class WorkbenchAiController {

    private final dev.langchain4j.model.embedding.EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;
    private final HighlightRepository highlightRepository; // <--- INJETE O REPOSITÓRIO

    @PostMapping("/suggest-links")
    public List<GravityResponse.StarMatch> suggestLinks(@RequestBody ContextSearchRequest request) {
        try {
            var embeddingResponse = embeddingModel.embed(request.text());

            EmbeddingSearchRequest searchRequest = EmbeddingSearchRequest.builder()
                    .queryEmbedding(embeddingResponse.content())
                    .filter(MetadataFilterBuilder.metadataKey("userId").isEqualTo(request.userId()))
                    .minScore(0.25)
                    .maxResults(request.topK())
                    .build();

            EmbeddingSearchResult<TextSegment> result = embeddingStore.search(searchRequest);
            
            // Aqui aplicamos a lógica sênior: Enriquecer os dados com o Postgres
            return result.matches().stream()
                    .map(this::enrichWithPostgres) 
                    .collect(Collectors.toList());
            
        } catch (Exception e) {
            log.error("Erro na sugestão: ", e);
            return List.of();
        }
    }

    private GravityResponse.StarMatch enrichWithPostgres(EmbeddingMatch<TextSegment> match) {
        String starId = null;
        String textContent = null; 

        if (match.embedded() != null && match.embedded().metadata() != null) {
            var metadata = match.embedded().metadata();
            
            String hId = metadata.getString("highlightId");
            String sId = metadata.getString("summaryId");
            starId = (sId != null) ? "summary-" + sId : hId;

            // 1. TENTA O POSTGRES (Fonte Primária)
            if (hId != null) {
                try {
                    var entity = highlightRepository.findById(Long.valueOf(hId));
                    if (entity.isPresent() && entity.get().getOriginalText() != null) {
                        textContent = entity.get().getOriginalText();
                    }
                } catch (Exception e) {
                    log.error("Erro ao acessar Postgres para ID {}", hId);
                }
            }

            // 2. SE O POSTGRES FALHOU OU O ID NÃO EXISTE MAIS, PEGA DO VETOR (Fallback)
            if (textContent == null || textContent.isBlank()) {
                textContent = metadata.getString("text_segment");
                if (textContent == null) textContent = metadata.getString("text");
            }
        }
        
        // Se tudo falhar mesmo, aí sim mandamos o aviso
        if (textContent == null) textContent = "Conteúdo não sincronizado";

        return new GravityResponse.StarMatch(starId, match.score(), textContent);
    }
}