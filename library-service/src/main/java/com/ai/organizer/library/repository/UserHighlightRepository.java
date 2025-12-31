package com.ai.organizer.library.repository;

import com.ai.organizer.library.domain.UserHighlight;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserHighlightRepository extends JpaRepository<UserHighlight, Long> {
    
    // Método útil para buscar todas as notas de um livro específico
    List<UserHighlight> findByFileHash(String fileHash);
    
    // Método útil para buscar notas de um usuário em um livro
    List<UserHighlight> findByUserIdAndFileHash(String userId, String fileHash);
}