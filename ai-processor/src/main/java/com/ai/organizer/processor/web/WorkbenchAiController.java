package com.ai.organizer.processor.web;

import com.ai.organizer.processor.repository.HighlightRepository;
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


@RestController
@RequestMapping("/api/ai/workbench")
@RequiredArgsConstructor
@Slf4j
public class WorkbenchAiController {

    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;
    private final HighlightRepository highlightRepository;

    @PostMapping("/suggest-links")
    public List<GravityResponse.StarMatch> suggestLinks(
            @RequestBody ContextSearchRequest request,
            @RequestHeader(name = "Accept-Language", defaultValue = "en") String language
    ) {
        log.info("🧠 [WORKBENCH] Buscando sugestões contextuais (Lang: {}) para o arquivo: {}", language, request.fileHash());

        try {
            
            Response<Embedding> embeddingResponse = embeddingModel.embed(request.text());

            EmbeddingSearchRequest searchRequest = EmbeddingSearchRequest.builder()
                    .queryEmbedding(embeddingResponse.content())
                    .filter(MetadataFilterBuilder.metadataKey("userId").isEqualTo(request.userId()))
                    .minScore(0.25) 
                    .maxResults(request.topK())
                    .build();

            EmbeddingSearchResult<TextSegment> result = embeddingStore.search(searchRequest);
            
            log.debug("🔍 Encontrados {} candidatos no banco vetorial.", result.matches().size());

            return result.matches().stream()
                    .map(this::enrichWithPostgres) 
                    .collect(Collectors.toList());
            
        } catch (Exception e) {
            log.error("❌ Falha crítica na análise contextual: {}", e.getMessage(), e);
            return List.of(); 
        }
    }


    private GravityResponse.StarMatch enrichWithPostgres(EmbeddingMatch<TextSegment> match) {
        String starId = "unknown";
        String textContent = null; 

        if (match.embedded() != null && match.embedded().metadata() != null) {
            var metadata = match.embedded().metadata();
            
            String hId = metadata.getString("highlightId");
            String sId = metadata.getString("summaryId");
            String dbId = metadata.getString("dbId");

            if (sId != null) {
                starId = "summary-" + sId;
            } else if (hId != null) {
                starId = hId;
            } else {
                starId = dbId;
            }
            if (hId != null) {
                try {
                    var entity = highlightRepository.findById(Long.valueOf(hId));
                    if (entity.isPresent() && entity.get().getOriginalText() != null) {
                        textContent = entity.get().getOriginalText();
                        log.trace("✅ Texto ID {} recuperado do Postgres.", hId);
                    }
                } catch (Exception e) {
                    log.warn("⚠️ Postgres indisponível para ID {}. Usando fallback vetorial.", hId);
                }
            }

            if (textContent == null || textContent.isBlank()) {
                textContent = metadata.getString("text_segment");
                if (textContent == null) textContent = metadata.getString("text");
            }
        }
        
        if (textContent == null) {
            textContent = "Conteúdo em processamento ou não sincronizado.";
        }

        return new GravityResponse.StarMatch(starId, match.score(), textContent);
    }
}