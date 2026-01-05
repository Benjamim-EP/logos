package com.ai.organizer.library.event;

public record SummaryRequestedEvent(
    Long summaryId,       // ID no banco (para atualizar status depois)
    String fileHash,
    String userId,
    String sourceType,    // "TEXT_SELECTION" ou "PAGE_RANGE"
    String textContent,   // O texto selecionado (se houver)
    Integer startPage,    // Página inicial (se range)
    Integer endPage       // Página final (se range)
) {}