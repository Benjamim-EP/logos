package com.ai.organizer.processor.event;

import java.util.List;

public record RadarUpdateRequestedEvent(
    String userId,
    List<String> snippets
) {}