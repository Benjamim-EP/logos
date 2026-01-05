package com.ai.organizer.library.repository;

import com.ai.organizer.library.domain.UserSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserSummaryRepository extends JpaRepository<UserSummary, Long> {
    List<UserSummary> findByUserIdAndFileHashOrderByCreatedAtDesc(String userId, String fileHash);
    List<UserSummary> findByUserId(String userId);
    long countByUserId(String userId);
}