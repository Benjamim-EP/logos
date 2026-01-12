package com.ai.organizer.library.event;

public record SummaryRequestedEvent(
    Long summaryId,       
    String fileHash,
    String userId,
    String sourceType,    
    String textContent,   
    Integer startPage,    
    Integer endPage,
    String preferredLanguage
) {}