package com.ai.organizer.processor; // (Ou library.event dependendo do projeto)

public record SummaryCompletedEvent(
    Long summaryId,
    String generatedText,
    String status // "COMPLETED" ou "FAILED"
) {}