// library-service/src/main/java/com/ai/organizer/library/domain/StarGalaxyLink.java

package com.ai.organizer.library.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "STAR_GALAXY_LINKS", 
    uniqueConstraints = @UniqueConstraint(columnNames = {"galaxy_id", "highlight_id"}), // Evita duplicatas
    indexes = {
        @Index(name = "idx_link_galaxy", columnList = "galaxy_id"),
        @Index(name = "idx_link_highlight", columnList = "highlight_id")
    }
)
@Data
@NoArgsConstructor
public class StarGalaxyLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // O "Pai" (A Galáxia)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "galaxy_id", nullable = false)
    private UserGalaxy galaxy;

    // O "Filho" (A Estrela/Highlight)
    // Usamos o ID direto ou a entidade UserHighlight. 
    // Como UserHighlight é uma entidade JPA neste mesmo serviço, podemos referenciar direto.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "highlight_id", nullable = false)
    private UserHighlight highlight;

    // A Força da Gravidade (Calculada pela IA uma única vez)
    @Column(nullable = false)
    private Double score;

    public StarGalaxyLink(UserGalaxy galaxy, UserHighlight highlight, Double score) {
        this.galaxy = galaxy;
        this.highlight = highlight;
        this.score = score;
    }
}