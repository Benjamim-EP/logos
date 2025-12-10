package com.ai.organizer.ingestion;

import com.fasterxml.jackson.databind.ObjectMapper; // <--- Import Novo
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.http.codec.multipart.FilePart;
import reactor.core.publisher.Mono;
import software.amazon.awssdk.core.async.AsyncRequestBody;
import software.amazon.awssdk.services.s3.S3AsyncClient;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.security.MessageDigest;
import java.util.concurrent.CompletableFuture;

@Service
public class IngestionService {

    private final S3AsyncClient s3Client;
    private final KafkaTemplate<String, String> kafkaTemplate; // <--- Mudei para String, String
    private final ObjectMapper objectMapper; // <--- Jackson

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    public IngestionService(S3AsyncClient s3Client, 
                            KafkaTemplate<String, String> kafkaTemplate, // <--- Ajuste aqui
                            ObjectMapper objectMapper) { // <--- Injeção
        this.s3Client = s3Client;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public Mono<String> processUpload(FilePart filePart, String userId) {
        return DataBufferUtils.join(filePart.content())
            .flatMap(dataBuffer -> {
                try {
                    byte[] bytes = new byte[dataBuffer.readableByteCount()];
                    dataBuffer.read(bytes);
                    DataBufferUtils.release(dataBuffer);

                    MessageDigest digest = MessageDigest.getInstance("SHA-256");
                    byte[] hashBytes = digest.digest(bytes);
                    String hash = bytesToHex(hashBytes);
                    
                    String s3Key = "uploads/" + hash + "/" + filePart.filename();

                    CompletableFuture<Void> uploadFuture = s3Client.putObject(
                        PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(s3Key)
                            .contentType(filePart.headers().getContentType().toString())
                            .build(),
                        AsyncRequestBody.fromBytes(bytes)
                    ).thenAccept(response -> {});

                    return Mono.fromFuture(uploadFuture)
                        .then(Mono.defer(() -> {
                            try {
                                IngestionEvent event = new IngestionEvent(
                                    hash, s3Key, filePart.filename(), userId, System.currentTimeMillis()
                                );
                                
                                // CORREÇÃO: Converte Objeto -> JSON String
                                String jsonEvent = objectMapper.writeValueAsString(event);
                                
                                kafkaTemplate.send("document.ingestion", hash, jsonEvent);
                                return Mono.just(hash);
                            } catch (Exception e) {
                                return Mono.error(e);
                            }
                        }));

                } catch (Exception e) {
                    return Mono.error(e);
                }
            });
    }

    private String bytesToHex(byte[] hash) {
        StringBuilder hexString = new StringBuilder(2 * hash.length);
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}