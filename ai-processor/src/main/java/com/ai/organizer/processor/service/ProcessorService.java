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
    private final StringRedisTemplate redisTemplate; // Redis Client
    private final S3Client s3Client; // Cliente S3 Síncrono (Mais fácil para Workers)

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    public void processDocument(IngestionEvent event) {
        String cacheKey = "doc_analysis:" + event.fileHash();

        // 1. FinOps Check: Já gastamos dinheiro processando isso antes?
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cacheKey))) {
            log.info("💰 CACHE HIT: Documento já processado. Recuperando do Redis.");
            String cachedResult = redisTemplate.opsForValue().get(cacheKey);
            log.info("Resultado (Cache): {}", cachedResult);
            return;
        }

        log.info("🤖 CACHE MISS: Iniciando processamento de IA para hash: {}", event.fileHash());

        try {
            // 2. Baixar texto do MinIO
            String content = downloadTextFromS3(event.s3Key());
            
            // Corte de segurança (Para não estourar tokens da demo)
            if (content.length() > 2000) {
                content = content.substring(0, 2000); 
            }

            // 3. Chamada à OpenAI (Pode demorar alguns segundos)
            String analysisResult = bookAssistant.analyzeText(content);

            // 4. Salvar no Redis (TTL de 24 horas)
            redisTemplate.opsForValue().set(cacheKey, analysisResult, Duration.ofHours(24));
            
            log.info("✅ Sucesso IA: {}", analysisResult);

        } catch (Exception e) {
            log.error("❌ Erro ao processar documento", e);
            // Aqui futuramente entra o Dead Letter Queue (DLQ)
        }
    }

    private String downloadTextFromS3(String key) {
        log.debug("Baixando do S3: {}", key);
        ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build());
        return objectBytes.asString(StandardCharsets.UTF_8);
    }
}