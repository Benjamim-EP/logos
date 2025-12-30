package com.ai.organizer.library.event;

public record HighlightEvent(
    Long highlightId,    // ID do banco (Para o AI Processor atualizar o status depois)
    String fileHash,     // ID do livro
    String userId,
    String content,      // O texto marcado
    String type          // "TEXT" ou "IMAGE"
) {}