package com.ai.organizer.library.event;

import java.util.List;

/**
 * Evento disparado quando o usuário atinge um marco de marcações.
 * Contém o contexto necessário para a IA gerar os eixos do Radar.
 */
public record RadarUpdateRequestedEvent(
    String userId,
    List<String> snippets
) {}