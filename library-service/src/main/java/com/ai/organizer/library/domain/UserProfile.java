package com.ai.organizer.library.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "USER_PROFILES")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserProfile {

    @Id
    @Column(name = "user_id")
    private String userId; // ID vindo do Keycloak (Subject)

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "bio")
    private String bio; // Já deixamos pronto para o futuro
}