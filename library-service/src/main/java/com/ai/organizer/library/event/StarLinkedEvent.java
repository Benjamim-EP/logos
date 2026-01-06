package com.ai.organizer.library.event; // (ou processor.event)

public record StarLinkedEvent(
    String galaxyId,
    String starId,
    Double score
) {}