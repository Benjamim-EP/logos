package com.ai.organizer.ingestion.dto;

public record UrlIngestionRequest(
    String pdfUrl,
    String title,
    String source // ex: "OpenAlex"
) {}