package com.ai.organizer.library.event;

public record HighlightEvent(
    Long highlightId,    
    String fileHash,    
    String userId,
    String content,      
    String type         
) {}