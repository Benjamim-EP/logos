// library-service/src/main/java/com/ai/organizer/library/dto/GalaxyStateDTO.java

package com.ai.organizer.library.dto;

import com.ai.organizer.library.domain.UserGalaxy;
import java.util.List;

public record GalaxyStateDTO(
    List<UserGalaxy> galaxies,
    List<LinkDTO> links
) {
    public record LinkDTO(
        String galaxyId,
        String highlightId,
        Double score
    ) {}
}