// library-service/src/main/java/com/ai/organizer/library/dto/StarDTO.java

package com.ai.organizer.library.dto;

import java.time.LocalDateTime;

public record StarDTO(
    String id,
    String content,
    String documentId,
    String documentTitle,
    LocalDateTime createdAt,
    String type,
    String positionJson
) {}