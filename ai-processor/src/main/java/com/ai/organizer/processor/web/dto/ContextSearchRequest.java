package com.ai.organizer.processor.web.dto;

public record ContextSearchRequest(
    String text,      // O conteúdo do card que estamos analisando
    String fileHash,  // O contexto (livro atual)
    String userId,
    int topK          // Quantos similares queremos (ex: 5)
) {}