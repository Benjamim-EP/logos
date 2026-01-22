package com.ai.organizer.library.dto;

import com.ai.organizer.library.domain.UserGalaxy;
import java.util.List;

public record GalaxyCreationResponse(
    UserGalaxy galaxy,
    List<LinkDTO> links
) {
    public record LinkDTO(
        String starId,
        Double score
    ) {}
}