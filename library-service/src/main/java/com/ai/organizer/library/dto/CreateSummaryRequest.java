package com.ai.organizer.library.dto;

public record CreateSummaryRequest(
    String fileHash,
    String sourceType, 
    String content,    
    String position,
    Integer startPage, 
    Integer endPage    
) {}