package com.ai.organizer.processor.service;

import com.ai.organizer.processor.IngestionEvent;
import com.ai.organizer.processor.ai.BookAssistant;
import com.ai.organizer.processor.domain.HighlightEntity; // <--- Import Novo
import com.ai.organizer.processor.repository.HighlightRepository; // <--- Import Novo
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
    private final HighlightRepository highlightRepository; // <--- Injeção do Repositório

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    // O nome "openai" deve bater com o application.yml
    @CircuitBreaker(name = "openai", fallbackMethod = "fallbackOpenAI")
    @Retry(name = "openai")
    public void processDocument(IngestionEvent event) {
        String cacheKey = "doc_analysis:" + event.fileHash();

        // 1. FinOps Check: Já gastamos dinheiro processando isso antes?
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cacheKey))) {
            log.info("💰 CACHE HIT (FinOps): Documento já processado. Recuperando do Redis.");
            // Num cenário real, aqui verificaríamos se já está no Oracle também
            return; 
        }

        log.info("🤖 CACHE MISS: Iniciando processamento de IA para hash: {}", event.fileHash());

        try {
            // 2. Verifica se é arquivo suportado (Texto)
            if (isBinaryFile(event.originalName())) {
                log.warn("⚠️ Arquivo binário (PDF/Imagem) detectado. Ignorando texto simples.");
                return;
            }

            // 3. Download do S3/MinIO
            String content = downloadTextFromS3(event.s3Key());
            
            // 4. Corte de segurança (Tokens)
            if (content.length() > 2000) {
                content = content.substring(0, 2000); 
            }

            // 5. Chamada à OpenAI (Protegida por @CircuitBreaker e @Retry)
            String analysisResult = bookAssistant.analyzeText(content);

            // 6. Salvar no Redis (TTL de 24 horas)
            redisTemplate.opsForValue().set(cacheKey, analysisResult, Duration.ofHours(24));
            
            log.info("✅ Sucesso IA. Salvando no Banco de Dados...");

            // 7. Persistência Oracle (Poliglota)
            if (!highlightRepository.existsByFileHash(event.fileHash())) {
                HighlightEntity entity = new HighlightEntity();
                entity.setFileHash(event.fileHash());
                entity.setUserId(event.userId());
                
                // Cuidado com limites do Oracle (VARCHAR2 4000)
                // Num sistema real usaríamos @Lob ou CLOB
                String safeContent = content.length() > 3900 ? content.substring(0, 3900) : content;
                entity.setOriginalText(safeContent); 
                entity.setAiAnalysisJson(analysisResult);
                
                highlightRepository.save(entity);
                log.info("💾 DADO SALVO NO ORACLE COM SUCESSO! ID: {}", entity.getId());
            }
            
        } catch (Exception e) {
            log.error("Erro na tentativa de processamento.", e);
            throw new RuntimeException("Erro de Processamento", e);
        }
    }

    public void fallbackOpenAI(IngestionEvent event, Throwable t) {
        log.error("🔥 FALLBACK ATIVADO: OpenAI indisponível. Erro: {}", t.getMessage());
        
        String errorJson = """
            {
                "summary": "Processamento Suspenso (Serviço Externo Indisponível)",
                "tags": ["PENDENTE", "ERRO_EXTERNO"],
                "sentiment": "Neutro"
            }
            """;
            
        String cacheKey = "doc_analysis:" + event.fileHash();
        redisTemplate.opsForValue().set(cacheKey, errorJson, Duration.ofMinutes(5));
        
        // Opcional: Salvar no Oracle com status de erro
        log.warn("⚠️ Estado de erro salvo no Redis temporariamente.");
    }

    private String downloadTextFromS3(String key) {
        log.debug("Baixando do S3: {}", key);
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