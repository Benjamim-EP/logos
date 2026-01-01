package com.ai.organizer.library.repository;

import com.ai.organizer.library.domain.UserHighlight;
import com.ai.organizer.library.dto.StarDTO;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserHighlightRepository extends JpaRepository<UserHighlight, Long> {
    
    // Método útil para buscar todas as notas de um livro específico
    List<UserHighlight> findByFileHash(String fileHash);
    
    // Método útil para buscar notas de um usuário em um livro
    List<UserHighlight> findByUserIdAndFileHash(String userId, String fileHash);

     @Query("""
        SELECT new com.ai.organizer.library.dto.StarDTO(
            CAST(h.id AS string),
            h.content,
            h.fileHash,
            d.title,
            h.createdAt,
            h.type
        )
        FROM UserHighlight h
        JOIN Document d ON h.fileHash = d.fileHash
        WHERE h.userId = :userId
        ORDER BY h.createdAt DESC
    """)
    List<StarDTO> findAllStarsByUserId(@Param("userId") String userId);
}