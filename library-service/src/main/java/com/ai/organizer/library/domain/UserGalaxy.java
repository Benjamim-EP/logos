// library-service/src/main/java/com/ai/organizer/library/domain/UserGalaxy.java

package com.ai.organizer.library.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "USER_GALAXIES", indexes = {
    @Index(name = "idx_galaxy_user", columnList = "user_id")
})
@Data
@NoArgsConstructor
public class UserGalaxy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // Ex: "Arquitetura", "Java"

    @Column(name = "user_id", nullable = false)
    private String userId;

    private String color; // Ex: "#FF5733"

    // Coordenadas persistidas (Onde o usuário deixou a galáxia na tela)
    @Column(name = "pos_x")
    private Double x;

    @Column(name = "pos_y")
    private Double y;

    // Referência ao vetor no Pinecone (Para não gastar OpenAI de novo)
    @Column(name = "vector_id")
    private String vectorId;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
        if (this.isActive == null) this.isActive = true;
    }

    public UserGalaxy(String name, String userId, String color, Double x, Double y) {
        this.name = name;
        this.userId = userId;
        this.color = color;
        this.x = x;
        this.y = y;
    }
}