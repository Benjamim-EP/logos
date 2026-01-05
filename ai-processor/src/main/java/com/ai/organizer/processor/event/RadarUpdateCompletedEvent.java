package com.ai.organizer.processor.event;

public record RadarUpdateCompletedEvent(
    String userId,
    String radarJson
) {}