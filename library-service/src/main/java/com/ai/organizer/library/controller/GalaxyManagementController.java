// library-service/src/main/java/com/ai/organizer/library/controller/GalaxyManagementController.java

package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.UserGalaxy;
import com.ai.organizer.library.dto.CreateGalaxyRequest;
import com.ai.organizer.library.dto.GalaxyStateDTO;
import com.ai.organizer.library.service.GalaxyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/galaxy/management")
@RequiredArgsConstructor
public class GalaxyManagementController {

    private final GalaxyService galaxyService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserGalaxy createGalaxy(
            @RequestBody CreateGalaxyRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = extractUserId(jwt);
        return galaxyService.createGalaxy(userId, request);
    }

    @GetMapping
    public List<UserGalaxy> getMyGalaxies(@AuthenticationPrincipal Jwt jwt) {
        String userId = extractUserId(jwt);
        return galaxyService.getUserGalaxies(userId);
    }

    private String extractUserId(Jwt jwt) {
        String claim = jwt.getClaimAsString("preferred_username");
        return claim != null ? claim : jwt.getSubject();
    }

    @GetMapping("/state")
    public GalaxyStateDTO getFullState(@AuthenticationPrincipal Jwt jwt) {
        String userId = extractUserId(jwt);
        return galaxyService.getUniverseState(userId);
    }
}