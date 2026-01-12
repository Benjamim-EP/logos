package com.ai.organizer.library.event;

import java.util.List;

public record RadarUpdateRequestedEvent(
    String userId,
    List<String> snippets
) {}