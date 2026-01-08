package com.ai.organizer.processor;

/**
 * DTO que representa o evento recebido do Kafka.
 * Deve ter os mesmos campos que o IngestionEvent da API de Ingestão,
 * mas reside no pacote deste microsserviço.
 */
public record IngestionEvent(
    String fileHash,     // Hash SHA-256 para verificação de duplicidade
    String s3Key,        // Caminho do arquivo no MinIO
    String originalName, // Nome original do arquivo
    String userId,       // ID do usuário que fez o upload
    long timestamp,      // Momento do upload
    long fileSize,
    String preferredLanguage
) {}