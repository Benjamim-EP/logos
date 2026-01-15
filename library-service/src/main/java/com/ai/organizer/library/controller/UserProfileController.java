package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.UserProfile;
import com.ai.organizer.library.dto.ProfileDTO;
import com.ai.organizer.library.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users/profile")
@RequiredArgsConstructor
@Slf4j
public class UserProfileController {

    private final UserProfileRepository repository;
    private final UserHighlightRepository highlightRepository;
    private final UserSummaryRepository summaryRepository;
    private final StarGalaxyLinkRepository linkRepository;
    private final DocumentRepository documentRepository;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ProfileDTO getProfile(@AuthenticationPrincipal Jwt jwt) {
        String userId = getUserId(jwt);
        String username = getUserName(jwt);
       
        UserProfile profile = repository.findById(userId)
                .orElseGet(() -> {
                    String defaultAvatar = "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=" + username;
                    return new UserProfile(userId, defaultAvatar, "Explorador da Galáxia", null);
                });

        
        Long usedBytes = documentRepository.getTotalStorageUsed(userId);
        long usedMB = usedBytes != null ? usedBytes / (1024 * 1024) : 0;
        long limitMB = 100;

        
        ProfileDTO.UserStats stats = new ProfileDTO.UserStats(
                highlightRepository.countByUserId(userId),
                summaryRepository.countByUserId(userId),
                linkRepository.countByUserId(userId),
                usedMB,    
                limitMB    
        );

        
        List<Map<String, Object>> radar = new ArrayList<>();
        try {
            if (profile.getRadarData() != null && !profile.getRadarData().isEmpty()) {
                radar = objectMapper.readValue(profile.getRadarData(), new TypeReference<>() {});
            } else {
                
                radar = List.of(
                    Map.of("subject", "Conhecimento", "A", 40),
                    Map.of("subject", "Curiosidade", "A", 70),
                    Map.of("subject", "Exploração", "A", 50),
                    Map.of("subject", "Análise", "A", 30),
                    Map.of("subject", "Síntese", "A", 60),
                    Map.of("subject", "Conexão", "A", 20)
                );
            }
        } catch (Exception e) {
            log.error("❌ Erro ao processar radar_data para o usuário {}: {}", userId, e.getMessage());
        }

        return new ProfileDTO(
                profile.getUserId(),
                profile.getAvatarUrl(),
                profile.getBio(),
                stats,
                radar
        );
    }

   
    @PutMapping("/avatar")
    public UserProfile updateAvatar(@RequestBody Map<String, String> payload, @AuthenticationPrincipal Jwt jwt) {
        String userId = getUserId(jwt);
        String newUrl = payload.get("avatarUrl");

        UserProfile profile = repository.findById(userId)
                .orElse(new UserProfile(userId, null, "Explorador", null));
        
        profile.setAvatarUrl(newUrl);
        return repository.save(profile);
    }

    

    private String getUserId(Jwt jwt) {
        String claim = jwt.getClaimAsString("preferred_username");
        return claim != null ? claim : jwt.getSubject();
    }
    
    private String getUserName(Jwt jwt) {
        String name = jwt.getClaimAsString("name");
        if (name == null) name = jwt.getClaimAsString("preferred_username");
        return name != null ? name : "Explorador";
    }
}