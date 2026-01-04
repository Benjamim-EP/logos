package com.ai.organizer.processor; // Ajuste o pacote conforme o serviço (library.event ou processor)

public record CoverGeneratedEvent(
    String fileHash,
    String coverPath // Caminho no GCS (ex: covers/12345.webp)
) {}