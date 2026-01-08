package com.ai.organizer.library.client.dto;

import java.util.List;

public record AiGravityResponse(
    String term,
    List<StarMatch> matches
) {
    public record StarMatch(
        String highlightId,
        Double score,
        String text // <--- VOCÊ ESQUECEU ESSE CAMPO AQUI!
    ) {}
}