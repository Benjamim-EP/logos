package com.ai.organizer.processor; 

public record SummaryCompletedEvent(
    Long summaryId,
    String generatedText,
    String status 
) {}