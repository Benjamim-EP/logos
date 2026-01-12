package com.ai.organizer.library.repository;

import com.ai.organizer.library.domain.Highlight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface HighlightRepository extends JpaRepository<Highlight, Long> {
    

    List<Highlight> findByUserId(String userId);
    
    @Query("SELECT h.fileHash as id, MIN(h.originalText) as preview, COUNT(h) as count, MAX(h.createdAt) as lastUpdate " +
           "FROM Highlight h WHERE h.userId = :userId GROUP BY h.fileHash")
    List<Object[]> findBooksByUserId(String userId);
}