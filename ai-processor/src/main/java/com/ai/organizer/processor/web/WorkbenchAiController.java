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

/**
 * Controller responsável pela inteligência contextual do Workbench.
 * 
 * Aplicando princípios de:
 * - Clean Architecture (Cap. 22): Camada de Interface Adapters isolando o domínio.
 * - Building Microservices (Cap. 5): Implementação de endpoints agnósticos e resilientes.
 * - Designing Data-Intensive Applications (Cap. 11): Estratégia de Read-side Enrichment para consistência.
 */
@RestController
@RequestMapping("/api/ai/workbench")
@RequiredArgsConstructor
@Slf4j
public class WorkbenchAiController {

    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;
    private final HighlightRepository highlightRepository;

    /**
     * Sugere conexões semânticas baseadas no conteúdo de um card.
     * Suporta internacionalização via Accept-Language para futuras expansões de IA.
     */
    @PostMapping("/suggest-links")
    public List<GravityResponse.StarMatch> suggestLinks(
            @RequestBody ContextSearchRequest request,
            @RequestHeader(name = "Accept-Language", defaultValue = "en") String language
    ) {
        log.info("🧠 [WORKBENCH] Buscando sugestões contextuais (Lang: {}) para o arquivo: {}", language, request.fileHash());

        try {
            // 1. Vetorização do texto de entrada (Representação Matemática do Conhecimento)
            Response<Embedding> embeddingResponse = embeddingModel.embed(request.text());

            // 2. Busca Vetorial (Matemática de Cosseno no Pinecone)
            // Filtramos por userId para isolamento de dados (Multi-tenancy)
            EmbeddingSearchRequest searchRequest = EmbeddingSearchRequest.builder()
                    .queryEmbedding(embeddingResponse.content())
                    .filter(MetadataFilterBuilder.metadataKey("userId").isEqualTo(request.userId()))
                    .minScore(0.25) // Threshold de relevância
                    .maxResults(request.topK())
                    .build();

            EmbeddingSearchResult<TextSegment> result = embeddingStore.search(searchRequest);
            
            log.debug("🔍 Encontrados {} candidatos no banco vetorial.", result.matches().size());

            // 3. Enriquecimento de Dados (Pattern: API Composition / Enrichment)
            // DDIA (Cap. 11): Como o Vector DB pode estar atrasado ou conter dados deletados (zumbis),
            // consultamos o Postgres como Single Source of Truth.
            return result.matches().stream()
                    .map(this::enrichWithPostgres) 
                    .collect(Collectors.toList());
            
        } catch (Exception e) {
            log.error("❌ Falha crítica na análise contextual: {}", e.getMessage(), e);
            return List.of(); // Fail-silent para não quebrar a UI do usuário
        }
    }

    /**
     * Transforma um match vetorial em um objeto de resposta rico, buscando o texto real no SQL.
     * 
     * Clean Architecture (Cap. 23): O "Presenter" converte modelos internos para formatos de visualização.
     */
    private GravityResponse.StarMatch enrichWithPostgres(EmbeddingMatch<TextSegment> match) {
        String starId = "unknown";
        String textContent = null; 

        if (match.embedded() != null && match.embedded().metadata() != null) {
            var metadata = match.embedded().metadata();
            
            // Recuperação de chaves de metadados
            String hId = metadata.getString("highlightId");
            String sId = metadata.getString("summaryId");
            String dbId = metadata.getString("dbId");

            // Define a identidade da "Estrela" para o Frontend
            if (sId != null) {
                starId = "summary-" + sId;
            } else if (hId != null) {
                starId = hId;
            } else {
                starId = dbId;
            }

            // 1. TENTA O POSTGRES (Fonte de Verdade Absoluta)
            // Software Architecture: The Hard Parts (Cap. 10): Lidando com dados distribuídos.
            if (hId != null) {
                try {
                    // Nota Sênior: O repositório usa o mapeamento correto para a coluna 'content'
                    var entity = highlightRepository.findById(Long.valueOf(hId));
                    if (entity.isPresent() && entity.get().getOriginalText() != null) {
                        textContent = entity.get().getOriginalText();
                        log.trace("✅ Texto ID {} recuperado do Postgres.", hId);
                    }
                } catch (Exception e) {
                    log.warn("⚠️ Postgres indisponível para ID {}. Usando fallback vetorial.", hId);
                }
            }

            // 2. FALLBACK VETORIAL (Consistência Eventual)
            // Se o dado foi deletado do Postgres mas ainda existe no Pinecone (Zumbi),
            // ou se for um documento recém-ingestado, pegamos o metadado que salvamos no vetor.
            if (textContent == null || textContent.isBlank()) {
                textContent = metadata.getString("text_segment");
                if (textContent == null) textContent = metadata.getString("text");
            }
        }
        
        // Garantia final contra strings nulas
        if (textContent == null) {
            textContent = "Conteúdo em processamento ou não sincronizado.";
        }

        return new GravityResponse.StarMatch(starId, match.score(), textContent);
    }
}