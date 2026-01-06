package com.ai.organizer.processor.event; // (ou processor.event)

public record StarLinkedEvent(
    String galaxyId,
    String starId,
    Double score
) {}