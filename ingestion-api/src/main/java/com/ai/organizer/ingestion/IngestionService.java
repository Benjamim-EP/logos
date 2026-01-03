package com.ai.organizer.ingestion;

import com.ai.organizer.ingestion.dto.UrlIngestionRequest;
import com.ai.organizer.ingestion.service.BlobStorageService; // <--- Nossa Interface Genérica
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.http.codec.multipart.FilePart;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.security.MessageDigest;

import java.net.URL;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class IngestionService {

    // Adeus S3AsyncClient! 👋
    // Olá Interface Genérica! (Injeta o GoogleStorageService automaticamente)
    private final BlobStorageService blobStorage; 
    
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private static final Logger log = LoggerFactory.getLogger(IngestionService.class);

    public IngestionService(BlobStorageService blobStorage, 
                            KafkaTemplate<String, String> kafkaTemplate, 
                            ObjectMapper objectMapper) {
        this.blobStorage = blobStorage;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public Mono<String> processUpload(FilePart filePart, String userId) {
        // 1. Carrega o arquivo para a memória
        return DataBufferUtils.join(filePart.content())
            .flatMap(dataBuffer -> {
                try {
                    byte[] bytes = new byte[dataBuffer.readableByteCount()];
                    dataBuffer.read(bytes);
                    DataBufferUtils.release(dataBuffer);

                    // 2. Calcula Hash
                    MessageDigest digest = MessageDigest.getInstance("SHA-256");
                    byte[] hashBytes = digest.digest(bytes);
                    String hash = bytesToHex(hashBytes);
                    
                    // Nome do arquivo no Google Cloud
                    String storageFilename = "uploads/" + hash + "/" + filePart.filename();
                    String contentType = filePart.headers().getContentType().toString();

                    // 3. Upload para o Google Cloud (Bloqueante envolvido em Reactive)
                    // Usamos publishOn(boundedElastic) porque o SDK do Google é bloqueante
                    return Mono.fromRunnable(() -> {
                        blobStorage.upload(storageFilename, bytes, contentType);
                    }).subscribeOn(Schedulers.boundedElastic())
                    .then(Mono.defer(() -> {
                        try {
                            // 4. Sucesso -> Envia evento Kafka
                            IngestionEvent event = new IngestionEvent(
                                hash, 
                                storageFilename, // Agora é o caminho no GCS
                                filePart.filename(), 
                                userId, 
                                System.currentTimeMillis()
                            );
                            
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

    public Mono<String> processUrlUpload(UrlIngestionRequest request, String userId) {
        // Envolvemos em Mono.fromCallable porque IO de rede (URL.openStream) é bloqueante
        return Mono.fromCallable(() -> {
            System.out.println("🌐 Baixando PDF remoto: " + request.title());
            
            // 1. Download do arquivo remoto para memória
            try (InputStream in = new URL(request.pdfUrl()).openStream();
                 ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }
                byte[] fileBytes = out.toByteArray();

                // 2. Calcula Hash SHA-256 (Identidade única)
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] hashBytes = digest.digest(fileBytes);
                String hash = bytesToHex(hashBytes);

                // 3. Define nome no Google Storage
                // Sanitiza o título para não quebrar o sistema de arquivos
                String safeFilename = request.title().replaceAll("[^a-zA-Z0-9.-]", "_") + ".pdf";
                String storagePath = "uploads/" + hash + "/" + safeFilename;

                // 4. Upload para o Bucket (Usando nossa interface genérica)
                blobStorage.upload(storagePath, fileBytes, "application/pdf");

                // 5. Dispara evento Kafka (Igual ao upload manual)
                IngestionEvent event = new IngestionEvent(
                    hash,
                    storagePath, 
                    request.title() + ".pdf", // Nome bonito para a biblioteca
                    userId,
                    System.currentTimeMillis()
                );

                String jsonEvent = objectMapper.writeValueAsString(event);
                kafkaTemplate.send("document.ingestion", hash, jsonEvent);

                return hash;
            }
        }).subscribeOn(Schedulers.boundedElastic()); // Executa em thread pool apropriada para I/O
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