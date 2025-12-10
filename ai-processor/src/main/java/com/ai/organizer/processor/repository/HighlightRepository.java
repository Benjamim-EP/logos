package com.ai.organizer.processor.repository;

import com.ai.organizer.processor.domain.HighlightEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HighlightRepository extends JpaRepository<HighlightEntity, Long> {
    boolean existsByFileHash(String fileHash);
}