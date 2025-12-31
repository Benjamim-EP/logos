package com.ai.organizer.processor;

public record HighlightEvent(
    Long highlightId,
    String fileHash,
    String userId,
    String content,
    String type
) {}