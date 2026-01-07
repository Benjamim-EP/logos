package com.ai.organizer.library.repository;

import com.ai.organizer.library.domain.WorkbenchState;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface WorkbenchRepository extends JpaRepository<WorkbenchState, Long> {
    Optional<WorkbenchState> findByUserIdAndFileHash(String userId, String fileHash);
}