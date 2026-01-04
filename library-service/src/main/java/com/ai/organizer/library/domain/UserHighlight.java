// library-service/src/main/java/com/ai/organizer/library/domain/UserHighlight.java

package com.ai.organizer.library.domain;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "USER_HIGHLIGHTS")
@Data
public class UserHighlight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "FILE_HASH", nullable = false)
    private String fileHash;

    @Column(name = "USER_ID", nullable = false)
    private String userId;
    
    @Column(name = "CONTENT", length = 4000)
    private String content;

    @Column(name = "TYPE")
    private String type;

    // --- NOVO CAMPO: Guarda as coordenadas visuais (JSON) ---
    @Column(name = "POSITION_JSON", columnDefinition = "TEXT")
    private String positionJson;

    @Column(name = "STATUS")
    private String status;

    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = "PENDING";
    }
}