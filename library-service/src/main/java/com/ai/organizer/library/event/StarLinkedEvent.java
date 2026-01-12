package com.ai.organizer.library.event;

public record StarLinkedEvent(
    String galaxyId,
    String starId,
    Double score
) {}