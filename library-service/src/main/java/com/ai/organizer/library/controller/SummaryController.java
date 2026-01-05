package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.UserSummary;
import com.ai.organizer.library.domain.enums.SummarySourceType;
import com.ai.organizer.library.dto.CreateSummaryRequest;
import com.ai.organizer.library.event.SummaryRequestedEvent;
import com.ai.organizer.library.repository.UserSummaryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/library/summaries")
@RequiredArgsConstructor
@Slf4j
public class SummaryController {

    private final UserSummaryRepository summaryRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public UserSummary requestSummary(
            @RequestBody CreateSummaryRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = extractUserId(jwt);
        log.info("🧠 Solicitando resumo ({}) para user: {}", request.sourceType(), userId);

        SummarySourceType type = SummarySourceType.valueOf(request.sourceType());
        String rangeLabel = (type == SummarySourceType.PAGE_RANGE) 
                ? request.startPage() + "-" + request.endPage() 
                : null;

        // 1. Salva estado inicial PENDING no banco
        UserSummary summary = new UserSummary(
                request.fileHash(),
                userId,
                type,
                rangeLabel
        );
        // Se for seleção de texto, já salvamos o input como referência (opcional, mas bom pra debug)
        // Mas o generatedText ficará null até a IA responder.
        summary.setPositionJson(request.position());
        
        summary = summaryRepository.save(summary);

        // 2. Dispara evento para o AI Processor
        try {
            SummaryRequestedEvent event = new SummaryRequestedEvent(
                    summary.getId(),
                    request.fileHash(),
                    userId,
                    request.sourceType(),
                    request.content(), // Texto selecionado
                    request.startPage(),
                    request.endPage()
            );

            // Serializa para JSON String (padrão que adotamos para evitar erros de classe)
            String jsonEvent = objectMapper.writeValueAsString(event);
            
            // Envia para novo tópico
            kafkaTemplate.send("summary.requested", summary.getId().toString(), jsonEvent);
            log.info("📨 Evento de resumo enviado para Kafka ID: {}", summary.getId());

        } catch (Exception e) {
            log.error("Erro ao enviar evento Kafka", e);
            summary.setStatus("FAILED");
            summaryRepository.save(summary);
            throw new RuntimeException("Erro ao processar solicitação");
        }

        return summary;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSummary(@PathVariable Long id) {
        // 1. Busca para validar e pegar dados (opcional)
        if (summaryRepository.existsById(id)) {
            // 2. Apaga do Postgres
            summaryRepository.deleteById(id);
            
            // 3. Avisa o AI Processor para apagar do Pinecone
            // (Vamos criar esse evento simples agora)
            kafkaTemplate.send("data.deleted", "SUMMARY:" + id);
            log.info("🗑️ Resumo {} deletado. Evento de limpeza enviado.", id);
        }
    }

    @GetMapping("/{fileHash}")
    public List<UserSummary> getSummariesByBook(
            @PathVariable String fileHash,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = extractUserId(jwt);
        return summaryRepository.findByUserIdAndFileHashOrderByCreatedAtDesc(userId, fileHash);
    }

    private String extractUserId(Jwt jwt) {
        String claim = jwt.getClaimAsString("preferred_username");
        return claim != null ? claim : jwt.getSubject();
    }
}