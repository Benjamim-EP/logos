package com.ai.organizer.processor.service;

import com.ai.organizer.processor.ai.BookAssistant;
import com.ai.organizer.processor.event.RadarUpdateCompletedEvent;
import com.ai.organizer.processor.event.RadarUpdateRequestedEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

/**
 * Serviço responsável por processar a análise de perfil cognitivo do usuário.
 * Transforma trechos de texto em métricas quantitativas para o Radar de Conhecimento.
 * 
 * Aplicando princípios de:
 * - Building Microservices (Cap 4): Event-Driven Communication.
 * - Clean Architecture (Cap 23): Presenters - Traduzindo dados brutos para visualização.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class RadarProcessorService {

    private final BookAssistant aiAssistant;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Consome solicitações de atualização de radar.
     * Recebe uma lista de snippets (marcações) e gera os 6 eixos de conhecimento.
     */
    @KafkaListener(topics = "radar.update.requested", groupId = "ai-processor-radar-group")
    public void processRadarRequest(String message) {
        log.info("🧠 [RADAR] Recebida solicitação de análise de perfil.");

        try {
            // 1. Desserialização Manual (Resiliência contra Header Mismatch)
            // Tratamos o JSON vindo como String conforme padronizado nas fases anteriores
            JsonNode jsonNode = objectMapper.readTree(message);
            
            // Suporte a dupla serialização (TextNode vs ObjectNode)
            if (jsonNode.isTextual()) {
                jsonNode = objectMapper.readTree(jsonNode.asText());
            }

            String userId = jsonNode.get("userId").asText();
            
            // Recupera a lista de snippets
            var snippetsNode = jsonNode.get("snippets");
            String consolidatedText = "";
            
            if (snippetsNode != null && snippetsNode.isArray()) {
                // Modern Java in Action (Cap 5): Usando Streams para consolidar o texto
                consolidatedText = java.util.stream.StreamSupport.stream(snippetsNode.spliterator(), false)
                        .map(JsonNode::asText)
                        .collect(Collectors.joining("\n---\n"));
            }

            if (consolidatedText.isEmpty()) {
                log.warn("⚠️ Nenhum texto enviado para o radar do usuário: {}", userId);
                return;
            }

            log.info("🤖 Analisando {} caracteres para gerar o radar de {}", consolidatedText.length(), userId);

            // 2. Inteligência Artificial: Extração de Tópicos e Pesos
            // O BookAssistant retorna o JSON: [{"subject": "Java", "A": 120}, ...]
            String radarJson = aiAssistant.generateKnowledgeRadar(consolidatedText);

            // 3. Sanitização do retorno da IA
            // Garante que o JSON não venha com aspas de Markdown (```json)
            String cleanRadarJson = radarJson.replace("```json", "").replace("```", "").trim();

            // 4. Envio do Evento de Conclusão
            RadarUpdateCompletedEvent completionEvent = new RadarUpdateCompletedEvent(userId, cleanRadarJson);
            String responseMessage = objectMapper.writeValueAsString(completionEvent);

            kafkaTemplate.send("radar.update.completed", userId, responseMessage);
            
            log.info("✅ [RADAR] Perfil cognitivo atualizado com sucesso para: {}", userId);

        } catch (Exception e) {
            log.error("❌ Erro ao processar análise de radar:", e);
            // Em cenários críticos, poderíamos enviar um evento de falha para a UI
        }
    }
}