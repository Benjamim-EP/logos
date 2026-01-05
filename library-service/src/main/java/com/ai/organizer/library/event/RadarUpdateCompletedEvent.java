package com.ai.organizer.library.event;

/**
 * Evento recebido do AI Processor com o resultado final do Radar.
 */
public record RadarUpdateCompletedEvent(
    String userId,
    String radarJson
) {}