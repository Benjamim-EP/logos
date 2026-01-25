package com.ai.organizer.library.client;

import com.ai.organizer.library.client.dto.AiGravityResponse;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AiProcessorClient {

    private final RestClient restClient;

    public AiProcessorClient(RestClient.Builder builder, 
                            @Value("${ai.processor.url:http://localhost:8081}") String aiUrl) {
        this.restClient = builder.baseUrl(aiUrl + "/api/ai").build();
    }

    public List<AiGravityResponse.StarMatch> getWorkbenchSuggestions(String text, String fileHash, String userId) {
        var payload = Map.of(
            "text", text,
            "fileHash", fileHash,
            "userId", userId,
            "topK", 5
        );

        try {
            return restClient.post()
                    .uri("/workbench/suggest-links") 
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + getJwtTokenFromContext())
                    .body(payload)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<AiGravityResponse.StarMatch>>() {}); 
        } catch (Exception e) {
            System.err.println("⚠️ Erro ao buscar sugestões no AI Processor: " + e.getMessage());
            return List.of();
        }
    }

    private String getJwtTokenFromContext() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtToken) {
            return jwtToken.getToken().getTokenValue();
        }
        return "";
    }

    public AiGravityResponse getGravityMatches(String term) {
        
        String token = getJwtTokenFromContext();
        String userId = getUserIdFromContext();

        try {
            return restClient.post()
                    .uri("/galaxy/gravity")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header("X-User-Id", userId) 
                    .body(term)
                    .retrieve()
                    .body(AiGravityResponse.class);
        } catch (Exception e) {
            System.err.println("⚠️ Falha ao contatar AI Processor: " + e.getMessage());
            return new AiGravityResponse(term, java.util.List.of());
        }
    }

    

     public void registerGalaxy(String id, String name, String userId) {
        try {
            var payload = Map.of("id", id, "name", name, "userId", userId);
            restClient.post()
                    .uri("/galaxy/register")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + getJwtTokenFromContext())
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            System.err.println("⚠️ Falha ao registrar galáxia no Pinecone: " + e.getMessage());
        }
    }

    private String getUserIdFromContext() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication instanceof JwtAuthenticationToken jwtToken) {
            String userId = jwtToken.getToken().getClaimAsString("preferred_username");
            if (userId == null) {
                userId = jwtToken.getToken().getSubject();
            }
            return userId;
        }
        return "unknown_user";
    }
}