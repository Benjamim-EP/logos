package com.ai.organizer.processor; 

public record CoverGeneratedEvent(
    String fileHash,
    String coverPath 
) {}