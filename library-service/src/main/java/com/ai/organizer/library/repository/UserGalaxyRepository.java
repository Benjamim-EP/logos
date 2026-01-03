// library-service/src/main/java/com/ai/organizer/library/repository/UserGalaxyRepository.java

package com.ai.organizer.library.repository;

import com.ai.organizer.library.domain.UserGalaxy;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserGalaxyRepository extends JpaRepository<UserGalaxy, Long> {
    List<UserGalaxy> findByUserIdAndIsActiveTrue(String userId);
    
    // Para validar duplicidade de nome por usuário
    boolean existsByUserIdAndNameIgnoreCase(String userId, String name);
}