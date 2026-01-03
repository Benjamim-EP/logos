// library-service/src/main/java/com/ai/organizer/library/client/dto/AiGravityResponse.java

package com.ai.organizer.library.client.dto;

import java.util.List;

// Espelho da resposta do AI Processor
public record AiGravityResponse(
    String term,
    List<StarMatch> matches
) {
    public record StarMatch(
        String highlightId,
        Double score
    ) {}
}