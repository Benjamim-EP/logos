// library-service/src/main/java/com/ai/organizer/library/repository/StarGalaxyLinkRepository.java

package com.ai.organizer.library.repository;

import com.ai.organizer.library.domain.StarGalaxyLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface StarGalaxyLinkRepository extends JpaRepository<StarGalaxyLink, Long> {

    // QUERY OTIMIZADA: Busca todos os links de um usuário de uma vez só.
    // Isso alimenta o "Cabo de Guerra" no frontend.
    @Query("""
        SELECT link 
        FROM StarGalaxyLink link
        JOIN FETCH link.galaxy g 
        WHERE g.userId = :userId AND g.isActive = true
    """)
    List<StarGalaxyLink> findAllActiveLinksByUserId(@Param("userId") String userId);
}