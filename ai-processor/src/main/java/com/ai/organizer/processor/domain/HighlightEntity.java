package com.ai.organizer.processor.domain;

import com.ai.organizer.processor.domain.enums.ContentType;     
import com.ai.organizer.processor.domain.enums.ProcessingStatus;
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

    @Column(name = "FILE_HASH")
    private String fileHash;

    private String userId;
    
    @Column(name = "content", length = 4000)
    private String originalText;

    @Enumerated(EnumType.STRING)
    private ContentType type;

    @Enumerated(EnumType.STRING)
    private ProcessingStatus status;
    

    @Column(name = "ai_analysis_json", length = 4000)
    private String aiAnalysisJson;

    private LocalDateTime createdAt;
}