
package com.ai.organizer.processor.web.dto;

import java.util.List;

public record GravityResponse(
    String term,
    List<StarMatch> matches
) {
    public record StarMatch(
        String highlightId, // O ID que vincula com a estrela na tela
        Double score,
        String text 
    ) {}
}