package com.ai.organizer.processor.service;

import com.ai.organizer.processor.IngestionEvent;
import com.ai.organizer.processor.ai.BookAssistant;
import com.ai.organizer.processor.domain.HighlightEntity;
import com.ai.organizer.processor.repository.HighlightRepository;
import com.ai.organizer.processor.infrastructure.GoogleStorageService; // <--- Interface Genérica (Crie este arquivo se não tiver)
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.store.embedding.EmbeddingStore;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProcessorService {

    // --- Injeção de Dependências ---
    private final BookAssistant bookAssistant;          // IA (OpenAI Chat)
    private final StringRedisTemplate redisTemplate;    // Cache (Redis)
    private final BlobStorageService blobStorage;       // <--- NOVO: Storage Genérico (Google Cloud)
    private final HighlightRepository highlightRepository; // Banco Relacional (Postgres)
    private final EmbeddingModel embeddingModel;        // Vetorização (OpenAI Embedding)
    private final EmbeddingStore<TextSegment> embeddingStore; // Banco Vetorial (Pinecone)

    /**
     * Processamento Principal.
     * Fluxo: Kafka -> Redis -> Google Storage -> OpenAI -> Postgres -> Pinecone
     */
    @CircuitBreaker(name = "openai", fallbackMethod = "fallbackOpenAI")
    @Retry(name = "openai")
    public void processDocument(IngestionEvent event) {
        String cacheKey = "doc_analysis:" + event.fileHash();

        // 1. FinOps: Verifica Cache
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cacheKey))) {
            log.info("💰 CACHE HIT (FinOps): Documento já processado. Recuperando do Redis.");
            // Em produção, você poderia recuperar o JSON do Redis e atualizar a UI via WebSocket
            return; 
        }

        log.info("🤖 CACHE MISS: Iniciando processamento para: {}", event.originalName());

        try {
            // 2. Validação de Binários
            if (isBinaryFile(event.originalName())) {
                log.warn("⚠️ Arquivo binário (PDF/Imagem) detectado no bucket. Salvando apenas metadados.");
                
                // Salva no Oracle/Postgres apenas o registro que o arquivo existe
                saveToRelationalDB(event, "Conteúdo binário disponível no Google Cloud Storage.", "{}");
                return;
            }

            // 3. Download do Google Cloud Storage (via Interface Genérica)
            String content = downloadTextFromStorage(event.s3Key());
            
            // 4. Validação de Conteúdo Vazio
            if (content == null || content.trim().isEmpty()) {
                log.error("❌ ERRO: Conteúdo vazio baixado do Storage: {}", event.s3Key());
                throw new RuntimeException("Arquivo vazio no Storage.");
            }

            // 5. Corte de Segurança (Tokens)
            if (content.length() > 2000) {
                content = content.substring(0, 2000); 
            }

            // 6. Inteligência Artificial (LangChain4j)
            String analysisResult = bookAssistant.analyzeText(content);

            // 7. Salvar no Redis
            redisTemplate.opsForValue().set(cacheKey, analysisResult, Duration.ofHours(24));
            
            log.info("✅ Sucesso IA. Persistindo dados...");

            // 8. Persistência Relacional (Postgres/Neon)
            HighlightEntity savedEntity = saveToRelationalDB(event, content, analysisResult);

            // 9. Persistência Vetorial (Pinecone)
            if (savedEntity != null) {
                saveToVectorDB(savedEntity, content, event);
            }
            
        } catch (Exception e) {
            log.error("Erro crítico no processamento.", e);
            throw new RuntimeException("Erro de Processamento", e);
        }
    }

    // --- Métodos Auxiliares ---

    private HighlightEntity saveToRelationalDB(IngestionEvent event, String content, String analysisResult) {
        if (!highlightRepository.existsByFileHash(event.fileHash())) {
            HighlightEntity entity = new HighlightEntity();
            entity.setFileHash(event.fileHash());
            entity.setUserId(event.userId());
            
            String safeContent = content.length() > 3900 ? content.substring(0, 3900) : content;
            entity.setOriginalText(safeContent); 
            entity.setAiAnalysisJson(analysisResult);
            
            HighlightEntity saved = highlightRepository.save(entity);
            log.info("💾 DADO SALVO NO BANCO RELACIONAL! ID: {}", saved.getId());
            return saved;
        }
        return null; // Já existe
    }

    private void saveToVectorDB(HighlightEntity entity, String content, IngestionEvent event) {
        log.info("▶️ Gerando Embedding para Pinecone...");
        
        Metadata metadata = Metadata.from("userId", event.userId())
                                    .add("fileHash", event.fileHash())
                                    .add("source", event.originalName())
                                    .add("dbId", String.valueOf(entity.getId()));

        TextSegment segment = TextSegment.from(content, metadata);
        Response<Embedding> embeddingResponse = embeddingModel.embed(segment);
        
        embeddingStore.add(String.valueOf(entity.getId()), embeddingResponse.content());
        log.info("✅ VETOR SALVO NO PINECONE!");
    }

    /**
     * Download usando a implementação injetada (GoogleStorageService)
     */
    private String downloadTextFromStorage(String key) {
        log.debug("Baixando do Storage: {}", key);
        
        // Chamada à interface genérica
        byte[] bytes = blobStorage.download(key);
        
        return new String(bytes, StandardCharsets.UTF_8);
    }

    public void fallbackOpenAI(IngestionEvent event, Throwable t) {
        log.error("🔥 FALLBACK ATIVADO: OpenAI indisponível. Erro: {}", t.getMessage());
        String errorJson = "{ \"status\": \"PENDENTE\", \"error\": \"Serviço indisponível\" }";
        String cacheKey = "doc_analysis:" + event.fileHash();
        redisTemplate.opsForValue().set(cacheKey, errorJson, Duration.ofMinutes(5));
    }

    private boolean isBinaryFile(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".pdf") || lower.endsWith(".jpg") || lower.endsWith(".png") || lower.endsWith(".jpeg");
    }
}