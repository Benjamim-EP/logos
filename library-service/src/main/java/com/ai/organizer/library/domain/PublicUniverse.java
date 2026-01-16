package com.ai.organizer.library.domain;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "public_universes")
@Data
public class PublicUniverse {

    @Id
    private String id;

    @Column(name = "title_key")
    private String titleKey;

    @Column(name = "description_key")
    private String descriptionKey;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "node_count")
    private Integer nodeCount;

    @Column(name = "pinecone_filter_value")
    private String pineconeFilterValue;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "available_languages", columnDefinition = "jsonb")
    private List<String> availableLanguages;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}