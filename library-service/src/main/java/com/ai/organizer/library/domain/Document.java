package com.ai.organizer.library.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "DOCUMENTS", indexes = {
    @Index(name = "idx_doc_user", columnList = "userId"),
    @Index(name = "idx_doc_hash", columnList = "fileHash", unique = true)
})
@Data
@NoArgsConstructor
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // O nome original do arquivo (ex: "Clean Architecture.pdf")
    @Column(nullable = false)
    private String title;

    // O elo de ligação com o arquivo físico e os highlights
    @Column(name = "file_hash", nullable = false, unique = true)
    private String fileHash;

    @Column(nullable = false)
    private String userId;

    // --- NOVO CAMPO: Caminho no Google Cloud Storage ---
    // Ex: "uploads/abc123/livro.pdf"
    @Column(name = "storage_path")
    private String storagePath; 

    @Column(name = "file_size")
    private Long fileSize; 

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    @Column(name = "cover_path")
    private String coverPath; // Novo campo!

    // --- CONSTRUTOR ATUALIZADO (4 Argumentos) ---
    public Document(String title, String fileHash, String userId, String storagePath, Long fileSize) {
        this.title = title;
        this.fileHash = fileHash;
        this.userId = userId;
        this.storagePath = storagePath;
        this.fileSize = fileSize;
    }
}