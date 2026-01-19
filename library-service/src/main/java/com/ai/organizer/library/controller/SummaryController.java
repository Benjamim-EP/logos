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
import java.util.concurrent.ThreadLocalRandom;

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
            @RequestHeader(name = "Accept-Language", defaultValue = "en") String lang,
            @RequestHeader(name = "X-Guest-Mode", required = false) String isGuestHeader,
            @RequestHeader(name = "X-User-Id", required = false) String guestUserId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        boolean isGuest = "true".equalsIgnoreCase(isGuestHeader);
        String userId = isGuest ? guestUserId : extractUserId(jwt);
        
        log.info("🧠 Solicitando resumo para: {} (Guest: {})", userId, isGuest);

        Long summaryId;
        UserSummary responseObj = new UserSummary(); // Objeto dummy para resposta

        if (isGuest) {
            summaryId = -Math.abs(ThreadLocalRandom.current().nextLong(1000000, 9999999));
            responseObj.setId(summaryId);
            responseObj.setStatus("PENDING");
        } else {
            // Salva no banco real
            UserSummary summary = new UserSummary(
                    request.fileHash(),
                    userId,
                    SummarySourceType.valueOf(request.sourceType()),
                    null
            );
            summary.setPositionJson(request.position());
            summary = summaryRepository.save(summary);
            summaryId = summary.getId();
            responseObj = summary;
        }

        try {
            SummaryRequestedEvent event = new SummaryRequestedEvent(
                    summaryId,
                    request.fileHash(),
                    userId,
                    request.sourceType(),
                    request.content(), 
                    request.startPage(),
                    request.endPage(),
                    lang 
            );

            String jsonEvent = objectMapper.writeValueAsString(event);
            kafkaTemplate.send("summary.requested", String.valueOf(summaryId), jsonEvent);

        } catch (Exception e) {
            log.error("Erro Kafka", e);
        }

        return responseObj;
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