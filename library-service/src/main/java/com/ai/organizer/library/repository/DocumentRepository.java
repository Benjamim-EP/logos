
package com.ai.organizer.library.repository;

import com.ai.organizer.library.domain.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    
    
    List<Document> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<Document> findByFileHash(String fileHash);

    @Query("SELECT SUM(d.fileSize) FROM Document d WHERE d.userId = :userId")
    Long getTotalStorageUsed(@Param("userId") String userId);
}