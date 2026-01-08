package com.ai.organizer.processor.service;

import com.ai.organizer.processor.CoverGeneratedEvent;
import com.ai.organizer.processor.HighlightEvent;
import com.ai.organizer.processor.IngestionEvent;
import com.ai.organizer.processor.event.StarLinkedEvent;
import com.ai.organizer.processor.ai.BookAssistant;
import com.ai.organizer.processor.domain.HighlightEntity;
import com.ai.organizer.processor.repository.HighlightRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.filter.MetadataFilterBuilder;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Collections;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProcessorService {

    // --- Injeção de Dependências ---
    private final BookAssistant bookAssistant;
    private final StringRedisTemplate redisTemplate;
    
    // STORAGE AGNÓSTICO
    private final BlobStorageService blobStorageService; 
    
    // GERADOR DE CAPAS
    private final CoverGeneratorService coverGenerator;

    private final HighlightRepository highlightRepository;
    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;
    
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper; 

    /**
     * FLUXO 1: Processamento de Arquivos Inteiros (Ingestão)
     * Chamado quando o usuário faz upload de um PDF/TXT ou salva via URL.
     */
    @CircuitBreaker(name = "openai", fallbackMethod = "fallbackOpenAI")
    @Retry(name = "openai")
    public void processDocument(IngestionEvent event) {
        String cacheKey = "doc_analysis:" + event.fileHash();

        // 1. FinOps Check (Cache)
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cacheKey))) {
            log.info("💰 CACHE HIT: Documento já processado. Recuperando do Redis.");
            return; 
        }

        log.info("🤖 CACHE MISS: Iniciando processamento para: {} (Idioma: {})", 
                event.originalName(), event.preferredLanguage());

        try {
            // 2. Baixar o arquivo (Binário Bruto)
            log.debug("Baixando arquivo do storage: {}", event.s3Key());
            byte[] fileBytes = blobStorageService.download(event.s3Key());

            // 3. GERAÇÃO DE CAPA (Se for PDF)
            if (isPdf(event.originalName())) {
                generateAndUploadCover(fileBytes, event.fileHash());
            }

            // 4. Estratégia de Conteúdo e Internacionalização
            String content;
            String analysisResult;
            boolean isPdfOrImage = isBinaryFile(event.originalName());

            // Mapeamento Sênior de Idioma: Converte "pl" para "Polish" para a IA
            String targetLanguage = mapLanguageForAi(event.preferredLanguage());

            if (isPdfOrImage) {
                log.info("📂 Binário detectado. Conteúdo bruto disponível no Storage.");
                
                // --- INTERNACIONALIZAÇÃO DO FALLBACK ---
                // Agora a mensagem de "Conteúdo no Storage" respeita o idioma do usuário
                content = getLocalizedContentMessage(targetLanguage);
                
                // O JSON falso gerado também respeita o idioma
                analysisResult = getLocalizedAnalysisFallback(targetLanguage);
                
            } else {
                // É texto puro (.txt, .md, .csv)
                content = new String(fileBytes, StandardCharsets.UTF_8);
                
                // Corte de segurança para IA
                String textToAnalyze = content.length() > 2000 ? content.substring(0, 2000) : content;
                
                log.info("🧠 Solicitando análise da OpenAI em: {}", targetLanguage);
                
                // EXECUÇÃO DA IA COM IDIOMA DINÂMICO
                analysisResult = bookAssistant.analyzeText(textToAnalyze, targetLanguage);
            }

            // 5. Salvar Cache no Redis
            redisTemplate.opsForValue().set(cacheKey, analysisResult, Duration.ofHours(24));
            
            // 6. Persistência Relacional (Postgres)
            HighlightEntity savedEntity = null;
            if (!highlightRepository.existsByFileHash(event.fileHash())) {
                HighlightEntity entity = new HighlightEntity();
                entity.setFileHash(event.fileHash());
                entity.setUserId(event.userId());
                
                String safeContent = content.length() > 3900 ? content.substring(0, 3900) : content;
                entity.setOriginalText(safeContent); 
                entity.setAiAnalysisJson(analysisResult);
                
                savedEntity = highlightRepository.save(entity);
                log.info("💾 Metadados salvos no Postgres. ID: {}", savedEntity.getId());
            }

            // 7. Persistência Vetorial (Pinecone - RAG)
            if (savedEntity != null && !isPdfOrImage) {
                log.info("▶️ Gerando Embedding do Documento Inteiro...");
                
                Metadata metadata = Metadata.from("userId", event.userId())
                                            .put("fileHash", event.fileHash())
                                            .put("source", event.originalName())
                                            .put("type", "document")
                                            .put("language", targetLanguage)
                                            .put("dbId", String.valueOf(savedEntity.getId()));

                TextSegment segment = TextSegment.from(content, metadata);
                Response<Embedding> embeddingResponse = embeddingModel.embed(segment);
                
                embeddingStore.addAll(
                    Collections.singletonList(embeddingResponse.content()),
                    Collections.singletonList(segment)
                );
                log.info("✅ Vetor salvo no Pinecone!");
            }
            
        } catch (Exception e) {
            log.error("❌ Erro crítico no processamento do documento {}: {}", event.fileHash(), e.getMessage());
            throw new RuntimeException("Falha no fluxo de ingestão", e);
        }
    }

    /**
     * FLUXO 2: Processamento de Highlights
     */
    public void processHighlight(HighlightEvent event) {
        try {
            if ("TEXT".equalsIgnoreCase(event.type())) {
                log.info("🔍 Processando Highlight ID: {}", event.highlightId());

                Metadata metadata = Metadata.from("userId", event.userId())
                        .put("fileHash", event.fileHash())
                        .put("type", "highlight")
                        .put("highlightId", String.valueOf(event.highlightId()))
                        .put("text", event.content());

                TextSegment segment = TextSegment.from(event.content(), metadata);
                Response<Embedding> embeddingResponse = embeddingModel.embed(segment);

                // 1. Salva no Pinecone
                embeddingStore.addAll(
                    Collections.singletonList(embeddingResponse.content()),
                    Collections.singletonList(segment)
                );
                
                log.info("✅ Highlight vetorizado no Pinecone.");

                // 2. Busca Reversa
                findAndLinkGalaxies(embeddingResponse.content(), event.userId(), String.valueOf(event.highlightId()));
                
            } else {
                log.warn("⚠️ Processamento de imagem em highlight ainda não implementado.");
            }
        } catch (Exception e) {
            log.error("❌ Erro ao processar highlight: {}", e.getMessage(), e);
        }
    }

    private void findAndLinkGalaxies(Embedding highlightVector, String userId, String highlightId) {
        log.info("🔎 [SHOOTING STAR] Procurando Galáxias próximas para o Highlight ID: {}", highlightId);
        try {
            EmbeddingSearchRequest request = EmbeddingSearchRequest.builder()
                    .queryEmbedding(highlightVector)
                    .filter(MetadataFilterBuilder.metadataKey("type").isEqualTo("galaxy"))
                    .minScore(0.35) 
                    .maxResults(5)
                    .build();

            var matches = embeddingStore.search(request).matches();

            log.info("   -> Encontradas {} galáxias candidatas no Pinecone.", matches.size());

            for (var match : matches) {
                if (match.embedded() == null || match.embedded().metadata() == null) continue;

                String galaxyUserId = match.embedded().metadata().getString("userId");
                String galaxyId = match.embedded().metadata().getString("galaxyId");
                
                if (userId.equals(galaxyUserId) && galaxyId != null) {
                    StarLinkedEvent linkEvent = new StarLinkedEvent(galaxyId, highlightId, match.score());
                    String json = objectMapper.writeValueAsString(linkEvent);
                    
                    kafkaTemplate.send("star.linked", galaxyId, json);
                    log.info("🔗 LINK DETECTADO: Highlight {} atraído por Galáxia {}", highlightId, galaxyId);
                }
            }
        } catch (Exception e) {
            log.error("Erro na busca reversa de galáxias", e);
        }
    }

    public void fallbackOpenAI(IngestionEvent event, Throwable t) {
        log.error("🔥 FALLBACK ATIVADO: OpenAI indisponível. Erro: {}", t.getMessage());
    }

    // --- Helpers de Internacionalização (Sênior Level) ---

    private String mapLanguageForAi(String langCode) {
        if (langCode == null || langCode.isBlank()) return "English";
        String baseCode = langCode.toLowerCase().split("-")[0];
        return switch (baseCode) {
            case "pt" -> "Portuguese";
            case "pl" -> "Polish";
            case "es" -> "Spanish";
            case "de" -> "German";
            case "fr" -> "French";
            default -> "English";
        };
    }

    private String getLocalizedContentMessage(String language) {
        return switch (language) {
            case "Polish" -> "[Oryginalny PDF/Obraz] - Treść dostępna w magazynie.";
            case "Portuguese" -> "[PDF/Imagem Original] - Conteúdo disponível no Storage.";
            default -> "[Original PDF/Image] - Content available in Storage.";
        };
    }

    private String getLocalizedAnalysisFallback(String language) {
        if ("Polish".equals(language)) {
            return """
                {
                    "summary": "Dokument zaimportowany. Dostępny do czytania i oznaczania.",
                    "tags": ["Zaimportowane", "Dokument"],
                    "sentiment": "Neutralny"
                }
            """;
        } else if ("Portuguese".equals(language)) {
            return """
                {
                    "summary": "Documento importado. Disponível para leitura e marcação.",
                    "tags": ["Importado", "Documento"],
                    "sentiment": "Neutro"
                }
            """;
        } else {
            return """
                {
                    "summary": "Document imported. Available for reading and highlighting.",
                    "tags": ["Imported", "Document"],
                    "sentiment": "Neutral"
                }
            """;
        }
    }

    private void generateAndUploadCover(byte[] pdfBytes, String fileHash) {
        try {
            byte[] coverBytes = coverGenerator.generateCoverFromPdf(pdfBytes);
            
            if (coverBytes != null) {
                String coverPath = "covers/" + fileHash + ".webp";
                blobStorageService.upload(coverPath, coverBytes, "image/webp");
                log.info("🖼️ Capa salva no Storage: {}", coverPath);
                
                CoverGeneratedEvent event = new CoverGeneratedEvent(fileHash, coverPath);
                String jsonEvent = objectMapper.writeValueAsString(event);
                
                kafkaTemplate.send("document.cover.generated", fileHash, jsonEvent); 
                log.info("📨 Evento de capa enviado para Kafka: {}", jsonEvent);
            }
        } catch (Exception e) {
            log.warn("⚠️ Não foi possível gerar a capa, mas o fluxo segue sem ela.", e);
        }
    }

    private boolean isBinaryFile(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".pdf") || lower.endsWith(".jpg") || lower.endsWith(".png") || lower.endsWith(".jpeg");
    }

    private boolean isPdf(String filename) {
        return filename != null && filename.toLowerCase().endsWith(".pdf");
    }
}