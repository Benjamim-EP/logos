package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.UserProfile;
import com.ai.organizer.library.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users/profile")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileRepository repository;

    @GetMapping
    public UserProfile getProfile(@AuthenticationPrincipal Jwt jwt) {
        String userId = getUserId(jwt);
        String username = getUserName(jwt);

        // Busca no banco ou retorna Default (Lazy Creation)
        return repository.findById(userId)
                .orElseGet(() -> {
                    // Lógica do Avatar Padrão: Robô com o nome do usuário como semente
                    String defaultAvatar = "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=" + username;
                    return new UserProfile(userId, defaultAvatar, "Novo Explorador");
                });
    }

    @PutMapping("/avatar")
    public UserProfile updateAvatar(@RequestBody Map<String, String> payload, @AuthenticationPrincipal Jwt jwt) {
        String userId = getUserId(jwt);
        String newUrl = payload.get("avatarUrl");

        UserProfile profile = repository.findById(userId)
                .orElse(new UserProfile(userId, newUrl, "Explorador"));
        
        profile.setAvatarUrl(newUrl);
        return repository.save(profile);
    }

    private String getUserId(Jwt jwt) {
        String claim = jwt.getClaimAsString("preferred_username");
        return claim != null ? claim : jwt.getSubject();
    }
    
    private String getUserName(Jwt jwt) {
        // Tenta pegar um nome legível para gerar a semente
        String name = jwt.getClaimAsString("name");
        if (name == null) name = jwt.getClaimAsString("preferred_username");
        return name != null ? name : "user";
    }
}