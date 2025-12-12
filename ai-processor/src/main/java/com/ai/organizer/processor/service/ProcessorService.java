package com.ai.organizer.processor.service;

import com.ai.organizer.processor.IngestionEvent;
import com.ai.organizer.processor.ai.BookAssistant;
import com.ai.organizer.processor.domain.HighlightEntity;
import com.ai.organizer.processor.repository.HighlightRepository;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.store.embedding.EmbeddingStore;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProcessorService {

    private final BookAssistant bookAssistant;
    private final StringRedisTemplate redisTemplate;
    private final S3Client s3Client;
    private final HighlightRepository highlightRepository;
    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @CircuitBreaker(name = "openai", fallbackMethod = "fallbackOpenAI")
    @Retry(name = "openai")
    public void processDocument(IngestionEvent event) {
        String cacheKey = "doc_analysis:" + event.fileHash();

        if (Boolean.TRUE.equals(redisTemplate.hasKey(cacheKey))) {
            log.info("💰 CACHE HIT (FinOps): Documento já processado. Recuperando do Redis.");
            // Lógica de recuperação de cache
            return; 
        }

        log.info("🤖 CACHE MISS: Iniciando processamento de IA para hash: {}", event.fileHash());

        try {
            if (isBinaryFile(event.originalName())) {
                log.warn("⚠️ Arquivo binário (PDF/Imagem) detectado. Ignorando texto simples.");
                return;
            }

            String content = downloadTextFromS3(event.s3Key());

            // --- DEBUG E VALIDAÇÃO ---
            if (content == null || content.trim().isEmpty()) {
                log.error("❌ ERRO: Conteúdo baixado do S3 está VAZIO ou NULO para a chave: {}", event.s3Key());
                throw new RuntimeException("Conteúdo do arquivo vazio.");
            }
            log.info("📄 Conteúdo baixado ({} chars): {}...", content.length(), content.substring(0, Math.min(content.length(), 50)));
            
            // 4. Corte de segurança (Tokens)
            if (content.length() > 2000) {
                content = content.substring(0, 2000); 
            }

            String analysisResult = bookAssistant.analyzeText(content);

            redisTemplate.opsForValue().set(cacheKey, analysisResult, Duration.ofHours(24));
            
            log.info("✅ Sucesso IA. Iniciando persistência poliglota...");

            HighlightEntity savedEntity = null;
            
            if (!highlightRepository.existsByFileHash(event.fileHash())) {
                HighlightEntity entity = new HighlightEntity();
                entity.setFileHash(event.fileHash());
                entity.setUserId(event.userId());
                
                String safeContent = content.length() > 3900 ? content.substring(0, 3900) : content;
                entity.setOriginalText(safeContent); 
                entity.setAiAnalysisJson(analysisResult);
                
                savedEntity = highlightRepository.save(entity);
                log.info("💾 DADO SALVO NO BANCO RELACIONAL COM SUCESSO! ID: {}", savedEntity.getId());
            } else {
                log.warn("⚠️ Registro duplicado no banco detectado.");
            }

            // --- PERSISTÊNCIA PINECONE ---
            if (savedEntity != null) {
                log.info("▶️ Gerando Embedding para o Pinecone...");
                
                // 1. Criamos o segmento apenas para gerar o vetor (Embedding)
                TextSegment segment = TextSegment.from(content);
                
                // 2. Geramos o vetor usando a OpenAI
                Response<Embedding> embeddingResponse = embeddingModel.embed(segment);
                
                // 3. Salvamos no Pinecone apenas o ID e o VETOR
                // Usamos o ID do PostgreSQL para vincular os dois mundos.
                // Na busca (RAG), o Pinecone devolve o ID, e buscamos o texto no Postgres.
                embeddingStore.add(String.valueOf(savedEntity.getId()), embeddingResponse.content());
                
                log.info("✅ VETOR SALVO NO PINECONE! ID Vinculado: {}", savedEntity.getId());
            }
            
        } catch (Exception e) {
            log.error("Erro na tentativa de processamento.", e);
            throw new RuntimeException("Erro de Processamento", e);
        }
    }

    public void fallbackOpenAI(IngestionEvent event, Throwable t) {
        log.error("🔥 FALLBACK ATIVADO. Motivo real do erro: ", t); 
        log.error("🔥 FALLBACK ATIVADO: OpenAI indisponível. Erro: {}", t.getMessage());
        String errorJson = "{ \"status\": \"PENDENTE\", \"error\": \"Serviço indisponível\" }";
        String cacheKey = "doc_analysis:" + event.fileHash();
        redisTemplate.opsForValue().set(cacheKey, errorJson, Duration.ofMinutes(5));
    }

    private String downloadTextFromS3(String key) {
        ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build());
        return new String(objectBytes.asByteArray(), StandardCharsets.UTF_8);
    }

    private boolean isBinaryFile(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".pdf") || lower.endsWith(".jpg") || lower.endsWith(".png") || lower.endsWith(".jpeg");
    }
}