package com.ai.organizer.library.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "STAR_GALAXY_LINKS", 
    uniqueConstraints = @UniqueConstraint(columnNames = {"galaxy_id", "star_id"}),
    indexes = {
        @Index(name = "idx_link_galaxy", columnList = "galaxy_id"),
        @Index(name = "idx_link_star", columnList = "star_id")
    }
)
@Data
@NoArgsConstructor
public class StarGalaxyLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "galaxy_id", nullable = false)
    private UserGalaxy galaxy;

    
    @Column(name = "star_id", nullable = false)
    private String starId;

    @Column(nullable = false)
    private Double score;

    public StarGalaxyLink(UserGalaxy galaxy, String starId, Double score) {
        this.galaxy = galaxy;
        this.starId = starId;
        this.score = score;
    }
}