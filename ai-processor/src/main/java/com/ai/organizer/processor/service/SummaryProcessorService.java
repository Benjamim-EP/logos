package com.ai.organizer.processor.service;

import com.ai.organizer.processor.SummaryCompletedEvent;
import com.ai.organizer.processor.ai.BookAssistant;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;


@Service
@Slf4j
public class SummaryProcessorService {

    private final BookAssistant aiAssistant;
    private final EmbeddingModel embeddingModel;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    
    private final EmbeddingStore<TextSegment> userStore;
    private final EmbeddingStore<TextSegment> guestStore;

    public SummaryProcessorService(
            BookAssistant aiAssistant,
            EmbeddingModel embeddingModel,
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper,
            @Qualifier("userEmbeddingStore") EmbeddingStore<TextSegment> userStore,
            @Qualifier("guestEmbeddingStore") EmbeddingStore<TextSegment> guestStore) {
        this.aiAssistant = aiAssistant;
        this.embeddingModel = embeddingModel;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.userStore = userStore;
        this.guestStore = guestStore;
    }

    public void processSummaryRequest(String message) {
        Long summaryId = null;
        boolean isGuest = false;

        try {
            JsonNode json = objectMapper.readTree(message);
            if (json.isTextual()) {
                json = objectMapper.readTree(json.asText());
            }

            // Tratamento de ID para Guest (pode vir como negativo ou string numérica grande)
            summaryId = json.get("summaryId").asLong();
            String userId = json.path("userId").asText();
            isGuest = userId.startsWith("guest-");

            String fileHash = json.path("fileHash").asText();
            String sourceType = json.path("sourceType").asText();
            String textToSummarize = json.path("textContent").asText();
            String langCode = json.path("preferredLanguage").asText("en");
            
            if (textToSummarize.length() > 30000) {
                textToSummarize = textToSummarize.substring(0, 30000); 
            }

            String fullLanguage = mapLanguage(langCode);
            
            log.info("🤖 Gerando resumo para {} (Guest: {})", userId, isGuest);
            String summaryText = aiAssistant.summarizeInTopics(textToSummarize, fullLanguage);

            Metadata metadata = Metadata.from("userId", userId)
                    .put("fileHash", fileHash)
                    .put("type", "resume") 
                    .put("summaryId", String.valueOf(summaryId))
                    .put("text", summaryText); // Guarda o texto no metadado para leitura rápida

            var segment = TextSegment.from(summaryText, metadata);
            var embedding = embeddingModel.embed(segment).content();
            
            EmbeddingStore<TextSegment> targetStore = isGuest ? guestStore : userStore;
            targetStore.add(embedding, segment);

            if (!isGuest) {
                sendCompletionEvent(summaryId, summaryText, "COMPLETED");
            }
            
            log.info("✅ Resumo concluído e vetorizado no index {}", isGuest ? "guest-data" : "logos");

        } catch (Exception e) {
            log.error("❌ Falha ao gerar resumo: {}", e.getMessage());
            if (summaryId != null && !isGuest) {
                sendCompletionEvent(summaryId, "Falha na IA: " + e.getMessage(), "FAILED");
            }
        }
    }

    private void sendCompletionEvent(Long id, String text, String status) {
        try {
            SummaryCompletedEvent event = new SummaryCompletedEvent(id, text, status);
            String json = objectMapper.writeValueAsString(event);
            kafkaTemplate.send("summary.completed", id.toString(), json);
        } catch (Exception e) {
            log.error("Erro ao enviar evento de conclusão", e);
        }
    }

    private String mapLanguage(String langCode) {
        if (langCode == null) return "English";
        return switch (langCode.toLowerCase().split("-")[0]) {
            case "pt" -> "Portuguese";
            case "pl" -> "Polish";
            case "es" -> "Spanish";
            default -> "English";
        };
    }
}