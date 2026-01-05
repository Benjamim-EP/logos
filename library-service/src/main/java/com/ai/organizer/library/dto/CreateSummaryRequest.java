package com.ai.organizer.library.dto;

public record CreateSummaryRequest(
    String fileHash,
    String sourceType, // TEXT_SELECTION ou PAGE_RANGE
    String content,    // Texto selecionado (opcional)
    String position,
    Integer startPage, // (opcional)
    Integer endPage    // (opcional)
) {}