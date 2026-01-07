package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.WorkbenchState;
import com.ai.organizer.library.repository.WorkbenchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/library/workbench")
@RequiredArgsConstructor
@Slf4j
public class WorkbenchController {

    private final WorkbenchRepository repository;

    public record WorkbenchDTO(String nodes, String edges) {}

    @GetMapping("/{fileHash}")
    public WorkbenchDTO getState(
            @PathVariable String fileHash, 
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = extractUserId(jwt);
        return repository.findByUserIdAndFileHash(userId, fileHash)
                .map(state -> new WorkbenchDTO(state.getNodesJson(), state.getEdgesJson()))
                .orElse(new WorkbenchDTO("[]", "[]")); // Retorna vazio se não existir
    }

    @PostMapping("/{fileHash}")
    public void saveState(
            @PathVariable String fileHash,
            @RequestBody WorkbenchDTO dto,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = extractUserId(jwt);
        
        WorkbenchState state = repository.findByUserIdAndFileHash(userId, fileHash)
                .orElse(new WorkbenchState(userId, fileHash, "[]", "[]"));
        
        state.setNodesJson(dto.nodes());
        state.setEdgesJson(dto.edges());
        
        repository.save(state);
        log.debug("💾 Workbench salvo para o arquivo: {}", fileHash);
    }

    private String extractUserId(Jwt jwt) {
        String claim = jwt.getClaimAsString("preferred_username");
        return claim != null ? claim : jwt.getSubject();
    }
}