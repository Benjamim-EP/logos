package com.ai.organizer.library.client;

import com.ai.organizer.library.client.dto.AiGravityResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AiProcessorClient {

    private final RestClient restClient;

    public AiProcessorClient(RestClient.Builder builder) {
        // Aponta para o Gateway (8000) ou direto para o AI Processor (8081)
        // Se usar 8081 direto, você pula o Gateway mas ainda precisa do Token pois o AI Processor é um Resource Server
        this.restClient = builder.baseUrl("http://localhost:8081/api/ai").build();
    }

    public AiGravityResponse getGravityMatches(String term) {
        // 1. Recupera o Token JWT da requisição atual (do SecurityContext do Spring)
        String token = getJwtTokenFromContext();

        try {
            return restClient.post()
                    .uri("/galaxy/gravity")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token) // <--- REPASSA O TOKEN
                    .body(term)
                    .retrieve()
                    .body(AiGravityResponse.class);
        } catch (Exception e) {
            System.err.println("⚠️ Falha ao contatar AI Processor: " + e.getMessage());
            return new AiGravityResponse(term, java.util.List.of());
        }
    }

    /**
     * Helper para extrair o valor bruto do Token JWT do contexto de segurança
     */
    private String getJwtTokenFromContext() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtToken) {
            return jwtToken.getToken().getTokenValue();
        }
        return "";
    }
}