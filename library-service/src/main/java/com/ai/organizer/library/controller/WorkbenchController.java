package com.ai.organizer.library.controller;

import com.ai.organizer.library.client.AiProcessorClient;
import com.ai.organizer.library.client.dto.AiGravityResponse;
import com.ai.organizer.library.domain.WorkbenchState;
import com.ai.organizer.library.repository.WorkbenchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Map;

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

    private final AiProcessorClient aiClient;

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

    @PostMapping("/suggest")
    public List<AiGravityResponse.StarMatch> getSuggestions(
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = extractUserId(jwt);
        String text = payload.get("text");
        String fileHash = payload.get("fileHash");
        
        log.info("🤖 Solicitando sugestões para o workbench. Arquivo: {}", fileHash);
        
        return aiClient.getWorkbenchSuggestions(text, fileHash, userId);
    }

    private String extractUserId(Jwt jwt) {
        String claim = jwt.getClaimAsString("preferred_username");
        return claim != null ? claim : jwt.getSubject();
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
}