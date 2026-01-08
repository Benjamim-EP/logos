
package com.ai.organizer.library.event;

public record IngestionEvent(
    String fileHash,
    String s3Key,
    String originalName,
    String userId,
    long timestamp,
    long fileSize,
    String preferredLanguage
) {}