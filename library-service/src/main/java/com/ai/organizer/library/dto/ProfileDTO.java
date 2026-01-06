package com.ai.organizer.library.dto;

import java.util.List;
import java.util.Map;

public record ProfileDTO(
    String userId,
    String avatarUrl,
    String bio,
    UserStats stats,
    List<Map<String, Object>> radar
) {
    public record UserStats(
        long highlights,
        long summaries,
        long connections,
        long storageUsed, 
        long storageLimit 
    ) {}
}