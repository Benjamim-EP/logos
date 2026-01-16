package com.ai.organizer.processor.web;

import com.ai.organizer.processor.repository.HighlightRepository;
import com.ai.organizer.processor.web.dto.ContextSearchRequest;
import com.ai.organizer.processor.web.dto.GravityResponse;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingSearchResult;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.filter.Filter;
import dev.langchain4j.store.embedding.filter.MetadataFilterBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai/workbench")
@Slf4j
public class WorkbenchAiController {

    private final EmbeddingModel embeddingModel;
    private final HighlightRepository highlightRepository;
    
    private final EmbeddingStore<TextSegment> userEmbeddingStore;
    private final EmbeddingStore<TextSegment> publicEmbeddingStore;

    public WorkbenchAiController(
            EmbeddingModel embeddingModel,
            HighlightRepository highlightRepository,
            @Qualifier("userEmbeddingStore") EmbeddingStore<TextSegment> userEmbeddingStore,
            @Qualifier("publicEmbeddingStore") EmbeddingStore<TextSegment> publicEmbeddingStore
    ) {
        this.embeddingModel = embeddingModel;
        this.highlightRepository = highlightRepository;
        this.userEmbeddingStore = userEmbeddingStore;
        this.publicEmbeddingStore = publicEmbeddingStore;
    }

    @PostMapping("/suggest-links")
    public List<GravityResponse.StarMatch> suggestLinks(
            @RequestBody ContextSearchRequest request,
            @RequestHeader(name = "X-Guest-Mode", required = false) String isGuest,
            @RequestHeader(name = "X-Target-Universe", required = false) String targetUniverse,
            @RequestHeader(name = "X-Target-Lang", required = false) String targetLang,
            @RequestHeader(name = "Accept-Language", defaultValue = "en") String browserLang
    ) {
        boolean guestMode = "true".equalsIgnoreCase(isGuest);
        log.info("🧠 [WORKBENCH] Buscando sugestões. Guest: {} | Hash: {}", guestMode, request.fileHash());

        try {
            var embeddingResponse = embeddingModel.embed(request.text());

            EmbeddingStore<TextSegment> targetStore;
            Filter filter;

            if (guestMode && targetUniverse != null) {
                targetStore = publicEmbeddingStore;
                String langToFilter = (targetLang != null) ? targetLang : browserLang;

                filter = MetadataFilterBuilder.metadataKey("universe").isEqualTo(targetUniverse)
                        .and(MetadataFilterBuilder.metadataKey("lang").isEqualTo(langToFilter));

            } else {
                targetStore = userEmbeddingStore;
                filter = MetadataFilterBuilder.metadataKey("userId").isEqualTo(request.userId());
            }

            EmbeddingSearchRequest searchRequest = EmbeddingSearchRequest.builder()
                    .queryEmbedding(embeddingResponse.content())
                    .filter(filter)
                    .minScore(0.25)
                    .maxResults(request.topK() > 0 ? request.topK() : 5)
                    .build();

            EmbeddingSearchResult<TextSegment> result = targetStore.search(searchRequest);
            
            log.debug("🔍 Encontrados {} candidatos.", result.matches().size());

            return result.matches().stream()
                    .map(match -> processMatch(match, guestMode)) 
                    .collect(Collectors.toList());
            
        } catch (Exception e) {
            log.error("❌ Falha crítica na análise contextual: {}", e.getMessage(), e);
            return List.of();
        }
    }

    private GravityResponse.StarMatch processMatch(EmbeddingMatch<TextSegment> match, boolean isGuestMode) {
        String starId = "unknown";
        String textContent = null;

        if (match.embedded() != null && match.embedded().metadata() != null) {
            var metadata = match.embedded().metadata();
            
            if (isGuestMode) {
                starId = match.embeddingId();
            } else {
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
            }

            if (isGuestMode) {
                String rawText = metadata.getString("text");
                String ref = metadata.getString("ref"); 
                
                if (rawText != null) {
                    textContent = (ref != null) ? ref + " - " + rawText : rawText;
                }

            } else {
                String hId = metadata.getString("highlightId");
                
                if (hId != null) {
                    try {
                        var entity = highlightRepository.findById(Long.valueOf(hId));
                        if (entity.isPresent() && entity.get().getOriginalText() != null) {
                            textContent = entity.get().getOriginalText();
                            log.trace("✅ Texto ID {} recuperado do Postgres.", hId);
                        }
                    } catch (Exception e) {
                        log.warn("⚠️ Postgres indisponível para ID {}. Usando fallback.", hId);
                    }
                }

                if (textContent == null) {
                    textContent = metadata.getString("text_segment");
                    if (textContent == null) textContent = metadata.getString("text");
                }
            }
        }
        
        if (textContent == null) {
            textContent = "Conteúdo não disponível.";
        }

        return new GravityResponse.StarMatch(starId, match.score(), textContent);
    }
}