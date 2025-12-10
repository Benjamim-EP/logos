package com.ai.organizer.processor.service;

import com.ai.organizer.processor.IngestionEvent;
import com.ai.organizer.processor.ai.BookAssistant;
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

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    public void processDocument(IngestionEvent event) {
        String cacheKey = "doc_analysis:" + event.fileHash();

        // 1. FinOps Check
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cacheKey))) {
            log.info("💰 CACHE HIT: Documento já processado. Recuperando do Redis.");
            String cachedResult = redisTemplate.opsForValue().get(cacheKey);
            log.info("Resultado (Cache): {}", cachedResult);
            return;
        }

        log.info("🤖 CACHE MISS: Iniciando processamento de IA para hash: {}", event.fileHash());

        try {
            // 2. Verifica se é Texto antes de tentar ler (Lógica Sênior)
            // Se for PDF ou Imagem no futuro, teremos outra estratégia.
            if (isBinaryFile(event.originalName())) {
                log.warn("⚠️ Arquivo binário detectado (PDF/Imagem). Ignorando processamento de texto simples: {}", event.originalName());
                return;
            }

            // 3. Baixar texto do MinIO
            String content = downloadTextFromS3(event.s3Key());
            
            // 4. Corte de segurança (Tokens)
            if (content.length() > 2000) {
                content = content.substring(0, 2000); 
            }

            // 5. Chamada à OpenAI
            String analysisResult = bookAssistant.analyzeText(content);

            // 6. Salvar no Redis
            redisTemplate.opsForValue().set(cacheKey, analysisResult, Duration.ofHours(24));
            
            log.info("✅ Sucesso IA: {}", analysisResult);

        } catch (Exception e) {
            log.error("❌ Erro ao processar documento", e);
        }
    }

    private String downloadTextFromS3(String key) {
        log.debug("Baixando do S3: {}", key);
        ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build());
        
        // CORREÇÃO AQUI: 
        // Usamos o construtor de String do Java em vez de objectBytes.asString().
        // O Java substitui caracteres inválidos () em vez de lançar erro fatal.
        return new String(objectBytes.asByteArray(), StandardCharsets.UTF_8);
    }

    private boolean isBinaryFile(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".pdf") || lower.endsWith(".jpg") || lower.endsWith(".png") || lower.endsWith(".jpeg");
    }
}