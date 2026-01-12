package com.ai.organizer.library.event;

public record RadarUpdateCompletedEvent(
    String userId,
    String radarJson
) {}