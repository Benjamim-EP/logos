// library-service/src/main/java/com/ai/organizer/library/client/AiProcessorClient.java

package com.ai.organizer.library.client;

import com.ai.organizer.library.client.dto.AiGravityResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AiProcessorClient {

    private final RestClient restClient;

    public AiProcessorClient(RestClient.Builder builder) {
        // Aponta para o Gateway ou direto para o serviço (depende da sua rede docker/local)
        // Via Gateway é melhor: http://localhost:8000/api/ai/galaxy/gravity
        this.restClient = builder.baseUrl("http://localhost:8000/api/ai").build();
    }

    public AiGravityResponse getGravityMatches(String term) {
        try {
            return restClient.post()
                    .uri("/galaxy/gravity")
                    .body(term)
                    .retrieve()
                    .body(AiGravityResponse.class);
        } catch (Exception e) {
            // Se a IA falhar, não quebramos a criação da galáxia, apenas retornamos vazio.
            // Isso é "Graceful Degradation".
            System.err.println("⚠️ Falha ao contatar AI Processor: " + e.getMessage());
            return new AiGravityResponse(term, java.util.List.of());
        }
    }
}