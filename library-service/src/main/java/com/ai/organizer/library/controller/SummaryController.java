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
            @RequestHeader(name = "Accept-Language", defaultValue = "en") String lang, // <--- 1. Captura o idioma
            @AuthenticationPrincipal Jwt jwt
    ) {
        String userId = extractUserId(jwt);
        log.info("🧠 Solicitando resumo ({}) para user: {} [Lang: {}]", request.sourceType(), userId, lang);

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
        summary.setPositionJson(request.position());
        
        summary = summaryRepository.save(summary);

        
        try {
            
            SummaryRequestedEvent event = new SummaryRequestedEvent(
                    summary.getId(),
                    request.fileHash(),
                    userId,
                    request.sourceType(),
                    request.content(), 
                    request.startPage(),
                    request.endPage(),
                    lang 
            );

            String jsonEvent = objectMapper.writeValueAsString(event);
            
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
        if (summaryRepository.existsById(id)) {
            summaryRepository.deleteById(id);
            
            try {
                kafkaTemplate.send("data.deleted", "SUMMARY:" + id);
                log.info("🗑️ Resumo {} deletado. Evento de limpeza enviado.", id);
            } catch (Exception e) {
                log.error("Erro ao enviar evento de deleção", e);
            }
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