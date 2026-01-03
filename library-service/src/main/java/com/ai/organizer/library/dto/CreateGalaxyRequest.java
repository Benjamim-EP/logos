// library-service/src/main/java/com/ai/organizer/library/dto/CreateGalaxyRequest.java

package com.ai.organizer.library.dto;

public record CreateGalaxyRequest(
    String name,
    String color,
    Double x,
    Double y
) {}