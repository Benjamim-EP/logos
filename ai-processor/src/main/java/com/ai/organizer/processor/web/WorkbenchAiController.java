package com.ai.organizer.processor.web;

import com.ai.organizer.processor.repository.HighlightRepository;
import com.ai.organizer.processor.web.dto.ContextSearchRequest;
import com.ai.organizer.processor.web.dto.GravityResponse;
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
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai/workbench")
@Slf4j
public class WorkbenchAiController {

    private final EmbeddingModel embeddingModel;
    private final HighlightRepository highlightRepository;
    
    // Injeção dos 3 Stores (Logos, Universes, Guest-Data)
    private final EmbeddingStore<TextSegment> userEmbeddingStore;
    private final EmbeddingStore<TextSegment> publicEmbeddingStore;
    private final EmbeddingStore<TextSegment> guestEmbeddingStore; // <--- NOVO

    public WorkbenchAiController(
            EmbeddingModel embeddingModel,
            HighlightRepository highlightRepository,
            @Qualifier("userEmbeddingStore") EmbeddingStore<TextSegment> userEmbeddingStore,
            @Qualifier("publicEmbeddingStore") EmbeddingStore<TextSegment> publicEmbeddingStore,
            @Qualifier("guestEmbeddingStore") EmbeddingStore<TextSegment> guestEmbeddingStore // <--- NOVO
    ) {
        this.embeddingModel = embeddingModel;
        this.highlightRepository = highlightRepository;
        this.userEmbeddingStore = userEmbeddingStore;
        this.publicEmbeddingStore = publicEmbeddingStore;
        this.guestEmbeddingStore = guestEmbeddingStore;
    }

    @PostMapping("/suggest-links")
    public List<GravityResponse.StarMatch> suggestLinks(
            @RequestBody ContextSearchRequest request,
            @RequestHeader(name = "X-Guest-Mode", required = false) String isGuest,
            @RequestHeader(name = "X-Target-Universe", required = false) String targetUniverse,
            @RequestHeader(name = "X-Target-Lang", required = false) String targetLang,
            @RequestHeader(name = "X-User-Id", required = false) String guestUserId, // ID do visitante
            @RequestHeader(name = "Accept-Language", defaultValue = "en") String browserLang
    ) {
        boolean guestMode = "true".equalsIgnoreCase(isGuest);
        log.info("🧠 [WORKBENCH] Buscando sugestões. Guest: {} | Hash: {}", guestMode, request.fileHash());

        try {
            var embeddingResponse = embeddingModel.embed(request.text());

            EmbeddingStore<TextSegment> targetStore;
            Filter filter;

            if (guestMode) {
                // --- LÓGICA DE SELEÇÃO DO GUEST ---
                
                // Caso 1: Guest está vendo a Bíblia (Universo Público)
                if (targetUniverse != null && !targetUniverse.isEmpty() && !"none".equals(targetUniverse)) {
                    targetStore = publicEmbeddingStore;
                    String langToFilter = (targetLang != null) ? targetLang : browserLang;

                    filter = MetadataFilterBuilder.metadataKey("universe").isEqualTo(targetUniverse)
                            .and(MetadataFilterBuilder.metadataKey("lang").isEqualTo(langToFilter));
                            
                    log.debug("🔎 Guest: Buscando em Public Store (Bíblia)");

                } else {
                    // Caso 2: Guest está no Universo Vazio (Dados Pessoais/Temp)
                    targetStore = guestEmbeddingStore;
                    
                    // Usa o ID que veio no header (gerado pelo front: guest-xyz...)
                    // Se não vier no header, tenta pegar do body, senão falha.
                    String userIdToUse = (guestUserId != null) ? guestUserId : request.userId();
                    
                    filter = MetadataFilterBuilder.metadataKey("userId").isEqualTo(userIdToUse);
                    
                    log.debug("🔎 Guest: Buscando em Guest Store (Dados Pessoais) para {}", userIdToUse);
                }

            } else {
                // --- MODO PADRÃO (USER LOGADO) ---
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
            
            // --- 1. RESOLUÇÃO DO ID ---
            if (isGuestMode) {
                // No modo Guest (seja Bíblia ou Pessoal), usamos o ID do vetor
                starId = match.embeddingId();
            } else {
                // No modo User, decodificamos os prefixos
                String hId = metadata.getString("highlightId");
                String sId = metadata.getString("summaryId");
                String dbId = metadata.getString("dbId");

                if (sId != null) starId = "summary-" + sId;
                else if (hId != null) starId = hId;
                else starId = dbId;
            }

            // --- 2. RECUPERAÇÃO DO TEXTO ---
            if (isGuestMode) {
                // MODO TURISTA: Texto vem direto do Metadata (Bíblia ou Guest Data)
                // Tenta pegar de 'text' (Guest Data) ou variações
                String rawText = metadata.getString("text");
                if (rawText == null) rawText = metadata.getString("text_segment");
                
                String ref = metadata.getString("ref"); 
                
                if (rawText != null) {
                    textContent = (ref != null) ? ref + " - " + rawText : rawText;
                }

            } else {
                // MODO USUÁRIO: Tenta SQL primeiro
                String hId = metadata.getString("highlightId");
                
                if (hId != null) {
                    try {
                        var entity = highlightRepository.findById(Long.valueOf(hId));
                        if (entity.isPresent() && entity.get().getOriginalText() != null) {
                            textContent = entity.get().getOriginalText();
                        }
                    } catch (Exception e) {
                        log.warn("⚠️ Postgres indisponível. Usando fallback.");
                    }
                }

                // Fallback Pinecone
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