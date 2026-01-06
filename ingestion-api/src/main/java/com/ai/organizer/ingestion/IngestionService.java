package com.ai.organizer.ingestion;

import com.ai.organizer.ingestion.dto.UrlIngestionRequest;
import com.ai.organizer.ingestion.service.BlobStorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.security.MessageDigest;

@Service
public class IngestionService {

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

    /**
     * Processa upload direto de arquivo (Drag & Drop)
     */
    public Mono<String> processUpload(FilePart filePart, String userId) {
        // 1. Carrega o arquivo para a memória de forma reativa
        return DataBufferUtils.join(filePart.content())
            .flatMap(dataBuffer -> {
                try {
                    byte[] bytes = new byte[dataBuffer.readableByteCount()];
                    dataBuffer.read(bytes);
                    DataBufferUtils.release(dataBuffer);

                    // 2. Captura Tamanho (Para controle de quota)
                    long fileSize = bytes.length;

                    // 3. Calcula Hash SHA-256 (Identidade única do conteúdo)
                    MessageDigest digest = MessageDigest.getInstance("SHA-256");
                    byte[] hashBytes = digest.digest(bytes);
                    String hash = bytesToHex(hashBytes);
                    
                    // Define caminho no Google Cloud
                    String storageFilename = "uploads/" + hash + "/" + filePart.filename();
                    String contentType = filePart.headers().getContentType() != null 
                            ? filePart.headers().getContentType().toString() 
                            : "application/octet-stream";

                    // 4. Upload para o Google Cloud (Bloqueante envolvido em thread pool elástica)
                    return Mono.fromRunnable(() -> {
                        blobStorage.upload(storageFilename, bytes, contentType);
                        log.info("☁️ Upload concluído no GCS: {} ({} bytes)", storageFilename, fileSize);
                    }).subscribeOn(Schedulers.boundedElastic())
                    .then(Mono.defer(() -> {
                        try {
                            // 5. Sucesso -> Envia evento Kafka com o tamanho do arquivo
                            IngestionEvent event = new IngestionEvent(
                                hash, 
                                storageFilename, // Path no GCS
                                filePart.filename(), 
                                userId, 
                                System.currentTimeMillis(),
                                fileSize // <--- NOVO CAMPO
                            );
                            
                            // Serializa para JSON String (evita problemas de tipo no consumer)
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

    /**
     * Processa ingestão via URL (Botão Salvar da Pesquisa)
     */
    public Mono<String> processUrlUpload(UrlIngestionRequest request, String userId) {
        // Envolvemos em Mono.fromCallable porque IO de rede (URL.openStream) é bloqueante
        return Mono.fromCallable(() -> {
            log.info("🌐 Baixando PDF remoto: {}", request.title());
            
            // 1. Download do arquivo remoto para memória
            try (InputStream in = new URL(request.pdfUrl()).openStream();
                 ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }
                byte[] fileBytes = out.toByteArray();

                // 2. Captura Tamanho
                long fileSize = fileBytes.length;

                // 3. Calcula Hash
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] hashBytes = digest.digest(fileBytes);
                String hash = bytesToHex(hashBytes);

                // 4. Sanitiza nome do arquivo
                String safeFilename = request.title().replaceAll("[^a-zA-Z0-9.-]", "_") + ".pdf";
                String storagePath = "uploads/" + hash + "/" + safeFilename;

                // 5. Upload para o Bucket
                blobStorage.upload(storagePath, fileBytes, "application/pdf");
                log.info("☁️ Download remoto salvo no GCS: {} ({} bytes)", storagePath, fileSize);

                // 6. Dispara evento Kafka
                IngestionEvent event = new IngestionEvent(
                    hash,
                    storagePath, 
                    request.title() + ".pdf", // Nome bonito para a biblioteca
                    userId,
                    System.currentTimeMillis(),
                    fileSize // <--- NOVO CAMPO
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