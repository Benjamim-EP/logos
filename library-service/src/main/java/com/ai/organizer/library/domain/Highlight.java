package com.ai.organizer.library.domain;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "HIGHLIGHTS", 
       // CORREÇÃO: Removemos a constraint unique da coluna, 
       // mas podemos manter um índice para performance.
       indexes = @Index(columnList = "file_hash") 
)
@Data
public class Highlight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // CORREÇÃO: Removemos unique=true daqui
    @Column(name = "FILE_HASH", nullable = false) 
    private String fileHash;

    private String userId;
    
    @Column(name = "original_text", length = 4000)
    private String originalText;

    // Novo: Tipo de conteúdo (TEXT ou IMAGE)
    @Enumerated(EnumType.STRING)
    private ContentType type;

    // Novo: Status do processamento (PENDING, PROCESSED, FAILED)
    @Enumerated(EnumType.STRING)
    private ProcessingStatus status;

    @Column(name = "ai_analysis_json", length = 4000)
    private String aiAnalysisJson;

    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = ProcessingStatus.PENDING;
        if (this.type == null) this.type = ContentType.TEXT;
    }
}
