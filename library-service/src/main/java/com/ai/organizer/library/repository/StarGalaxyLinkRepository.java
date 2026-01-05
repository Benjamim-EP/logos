package com.ai.organizer.library.repository;

import com.ai.organizer.library.domain.StarGalaxyLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface StarGalaxyLinkRepository extends JpaRepository<StarGalaxyLink, Long> {
    
    // Busca todos os links que pertencem às galáxias de um usuário específico
    @Query("SELECT l FROM StarGalaxyLink l WHERE l.galaxy.userId = :userId")
    List<StarGalaxyLink> findByUserId(@Param("userId") String userId);

    @Modifying
    @Query("DELETE FROM StarGalaxyLink l WHERE l.galaxy.id = :galaxyId")
    void deleteByGalaxyId(@Param("galaxyId") Long galaxyId);

    @Query("SELECT COUNT(l) FROM StarGalaxyLink l WHERE l.galaxy.userId = :userId")
    long countByUserId(@Param("userId") String userId);
}