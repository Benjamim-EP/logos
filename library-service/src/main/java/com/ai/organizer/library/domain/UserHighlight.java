package com.ai.organizer.library.domain;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "USER_HIGHLIGHTS") // Nome da nova tabela no banco
@Data
public class UserHighlight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Link com o documento original (Não é unique aqui!)
    @Column(name = "FILE_HASH", nullable = false)
    private String fileHash;

    @Column(name = "USER_ID", nullable = false)
    private String userId;
    
    // O texto que o usuário marcou
    @Column(name = "CONTENT", length = 4000)
    private String content;

    // TEXT ou IMAGE
    @Column(name = "TYPE")
    private String type;

    // Status da análise da IA (PENDING, PROCESSED)
    @Column(name = "STATUS")
    private String status;

    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = "PENDING";
    }
}