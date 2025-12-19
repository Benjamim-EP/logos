package com.ai.organizer.library.domain; // <--- O PACOTE CORRETO

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "HIGHLIGHTS")
@Data
public class Highlight {

    @Id
    private Long id; // Apenas leitura

    @Column(name = "FILE_HASH")
    private String fileHash;

    @Column(name = "USER_ID")
    private String userId;
    
    @Column(name = "ORIGINAL_TEXT")
    private String originalText;

    @Column(name = "AI_ANALYSIS_JSON", length = 4000)
    private String aiAnalysisJson;

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;
}