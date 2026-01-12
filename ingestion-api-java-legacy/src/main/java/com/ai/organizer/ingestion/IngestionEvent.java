package com.ai.organizer.ingestion;

public record IngestionEvent(
    String fileHash,     // ID único do conteúdo (SHA-256)
    String s3Key,        // Caminho no MinIO
    String originalName, // Nome do arquivo
    String userId,       // Quem mandou
    long timestamp,
    long fileSize,
    String preferredLanguage
) {}