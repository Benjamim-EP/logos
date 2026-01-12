package com.ai.organizer.library.event; // Ajuste o pacote conforme o serviço (library.event ou processor)

public record CoverGeneratedEvent(
    String fileHash,
    String coverPath 
) {}