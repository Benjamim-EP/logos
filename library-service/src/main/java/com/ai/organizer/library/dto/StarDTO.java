
package com.ai.organizer.library.dto;

import java.time.LocalDateTime;

public record StarDTO(
    String id,          // ID do Highlight
    String content,     // O texto marcado (preview)
    String documentId,  // Para saber de qual livro veio
    String documentTitle, // Para mostrar no tooltip
    LocalDateTime createdAt,
    String type         // TEXT ou IMAGE
) {}