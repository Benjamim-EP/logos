package com.ai.organizer.library.domain;

import com.ai.organizer.library.domain.enums.SummarySourceType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "USER_SUMMARIES")
@Data
@NoArgsConstructor
public class UserSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fileHash;

    @Column(nullable = false)
    private String userId;

    // O texto final gerado pela IA (Markdown)
    @Column(columnDefinition = "TEXT")
    private String generatedText;

    // Metadados da solicitação
    @Enumerated(EnumType.STRING)
    private SummarySourceType sourceType;

    // Ex: "10-15" ou null se for seleção de texto
    private String pageRange;

    // PENDING, COMPLETED, FAILED
    private String status;

    private LocalDateTime createdAt;

    @Column(name = "POSITION_JSON", columnDefinition = "TEXT")
    private String positionJson;

    @PrePersist
    void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = "PENDING";
    }

    public UserSummary(String fileHash, String userId, SummarySourceType sourceType, String pageRange) {
        this.fileHash = fileHash;
        this.userId = userId;
        this.sourceType = sourceType;
        this.pageRange = pageRange;
    }
}