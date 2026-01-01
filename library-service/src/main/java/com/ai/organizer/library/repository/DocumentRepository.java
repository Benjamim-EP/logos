
package com.ai.organizer.library.repository;

import com.ai.organizer.library.domain.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    
    // Busca eficiente para a estante
    List<Document> findByUserIdOrderByCreatedAtDesc(String userId);

    // Para evitar duplicatas na ingestão (Idempotência)
    Optional<Document> findByFileHash(String fileHash);
}