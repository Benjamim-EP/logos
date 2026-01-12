package com.ai.organizer.library.event; 

public record SummaryCompletedEvent(
    Long summaryId,
    String generatedText,
    String status 
) {}