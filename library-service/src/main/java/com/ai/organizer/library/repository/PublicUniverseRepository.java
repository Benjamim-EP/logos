package com.ai.organizer.library.repository;

import com.ai.organizer.library.domain.PublicUniverse;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PublicUniverseRepository extends JpaRepository<PublicUniverse, String> {
    List<PublicUniverse> findByIsActiveTrue();
}