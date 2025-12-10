package com.ai.organizer.processor.domain;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "HIGHLIGHTS")
@Data
public class HighlightEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "FILE_HASH", unique = true)
    private String fileHash;

    private String userId;
    
    @Column(length = 4000) // Oracle Text Limit
    private String originalText;

    @Column(length = 4000) // JSON da IA
    private String aiAnalysisJson;

    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}