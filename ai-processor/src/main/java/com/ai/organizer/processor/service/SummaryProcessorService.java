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

import java.util.Collections;

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
            // 1. LOG DE DEBUG
            log.info("📨 Payload Bruto Recebido: {}", message);

            JsonNode json = objectMapper.readTree(message);

            // --- CORREÇÃO CRÍTICA: DUPLA SERIALIZAÇÃO ---
            // Se o Jackson leu como um "TextNode" (String pura), significa que 
            // recebemos um JSON dentro de uma String. Precisamos fazer o parse do conteúdo.
            if (json.isTextual()) {
                log.info("⚠️ Detectada serialização dupla (TextNode). Realizando segundo parse...");
                json = objectMapper.readTree(json.asText());
            }
            // ---------------------------------------------

            // 2. Extração Segura de ID
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

            // 3. Obtém o texto base
            String textToSummarize = "";

            if ("PAGE_RANGE".equals(sourceType)) {
                // TODO: Implementar lógica de download do PDF e extração de páginas aqui
                throw new UnsupportedOperationException("Resumo por página requer update do evento com storagePath.");
            } else {
                // TEXT_SELECTION
                textToSummarize = json.path("textContent").asText();
            }

            if (textToSummarize == null || textToSummarize.isEmpty()) {
                throw new IllegalArgumentException("Texto para resumo está vazio.");
            }

            // 4. Valida tamanho
            if (textToSummarize.length() > 30000) {
                textToSummarize = textToSummarize.substring(0, 30000); 
            }

            String langCode = json.path("preferredLanguage").asText("en");
            String fullLanguage = mapLanguage(langCode);

            // 5. Chama a OpenAI
            log.info("🤖 Enviando para OpenAI...");
            String summaryText = aiAssistant.summarizeInTopics(textToSummarize, fullLanguage);

            // 6. Vetoriza o Resumo
            Metadata metadata = Metadata.from("userId", userId)
                    .put("fileHash", fileHash)
                    .put("type", "resume") 
                    .put("summaryId", String.valueOf(summaryId));

            var segment = TextSegment.from(summaryText, metadata);
            var embedding = embeddingModel.embed(segment).content();
            embeddingStore.add(embedding, segment);

            // 7. Sucesso -> Avisa Library
            sendCompletionEvent(summaryId, summaryText, "COMPLETED");
            log.info("✅ Resumo concluído e vetorizado!");

        } catch (Exception e) {
            log.error("❌ Falha ao gerar resumo: {}", e.getMessage());
            // Agora que conseguimos ler o ID (se o erro não foi no parse), podemos avisar o front do erro
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