package com.ai.organizer.processor.service;

import com.ai.organizer.processor.SummaryCompletedEvent;
import com.ai.organizer.processor.ai.BookAssistant;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;


@Service
@Slf4j
@RequiredArgsConstructor
public class SummaryProcessorService {

    private final BookAssistant aiAssistant;
    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public void processSummaryRequest(String message) {
        Long summaryId = null;
        try {
            log.info("📨 Payload Bruto Recebido: {}", message);

            JsonNode json = objectMapper.readTree(message);

            if (json.isTextual()) {
                log.info("⚠️ Detectada serialização dupla (TextNode). Realizando segundo parse...");
                json = objectMapper.readTree(json.asText());
            }

            if (json.has("summaryId")) {
                summaryId = json.get("summaryId").asLong();
            } else if (json.has("id")) {
                summaryId = json.get("id").asLong();
            } else {
                throw new IllegalArgumentException("JSON inválido: campo 'summaryId' não encontrado. JSON: " + json.toString());
            }

            String fileHash = json.path("fileHash").asText();
            String sourceType = json.path("sourceType").asText();
            String userId = json.path("userId").asText();

            log.info("🧠 Processando resumo ID: {} | Tipo: {}", summaryId, sourceType);

            String textToSummarize = "";

            if ("PAGE_RANGE".equals(sourceType)) {
                throw new UnsupportedOperationException("Resumo por página requer update do evento com storagePath.");
            } else {
                textToSummarize = json.path("textContent").asText();
            }

            if (textToSummarize == null || textToSummarize.isEmpty()) {
                throw new IllegalArgumentException("Texto para resumo está vazio.");
            }

            if (textToSummarize.length() > 30000) {
                textToSummarize = textToSummarize.substring(0, 30000); 
            }

            String langCode = json.path("preferredLanguage").asText("en");
            String fullLanguage = mapLanguage(langCode);

            log.info("🤖 Enviando para OpenAI...");
            String summaryText = aiAssistant.summarizeInTopics(textToSummarize, fullLanguage);


            Metadata metadata = Metadata.from("userId", userId)
                    .put("fileHash", fileHash)
                    .put("type", "resume") 
                    .put("summaryId", String.valueOf(summaryId));

            var segment = TextSegment.from(summaryText, metadata);
            var embedding = embeddingModel.embed(segment).content();
            embeddingStore.add(embedding, segment);

            sendCompletionEvent(summaryId, summaryText, "COMPLETED");
            log.info("✅ Resumo concluído e vetorizado!");

        } catch (Exception e) {
            log.error("❌ Falha ao gerar resumo: {}", e.getMessage());
            if (summaryId != null) {
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