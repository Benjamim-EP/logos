// ai-processor/src/main/java/com/ai/organizer/processor/service/ProcessorService.java

package com.ai.organizer.processor.service;

import com.ai.organizer.processor.HighlightEvent;
import com.ai.organizer.processor.IngestionEvent;
import com.ai.organizer.processor.ai.BookAssistant;
import com.ai.organizer.processor.domain.HighlightEntity;
import com.ai.organizer.processor.repository.HighlightRepository;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.store.embedding.EmbeddingStore;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Collections;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProcessorService {

    // --- Injeção de Dependências ---
    private final BookAssistant bookAssistant;          // Interface LangChain4j (OpenAI Chat)
    private final StringRedisTemplate redisTemplate;    // Cache FinOps
    
    // MUDANÇA: Injetamos a abstração, não a implementação (S3/GCS)
    private final BlobStorageService blobStorageService; 
    
    private final HighlightRepository highlightRepository; // Banco Relacional
    private final EmbeddingModel embeddingModel;        // Gerador de Vetores
    private final EmbeddingStore<TextSegment> embeddingStore; // Banco Vetorial (Pinecone)

    /**
     * FLUXO 1: Processamento de Arquivos Inteiros (Ingestão)
     * Chamado quando o usuário faz upload de um PDF/TXT novo.
     */
    @CircuitBreaker(name = "openai", fallbackMethod = "fallbackOpenAI")
    @Retry(name = "openai")
    public void processDocument(IngestionEvent event) {
        String cacheKey = "doc_analysis:" + event.fileHash();

        // 1. FinOps Check (Cache)
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cacheKey))) {
            log.info("💰 CACHE HIT (FinOps): Documento já processado. Recuperando do Redis.");
            return; 
        }

        log.info("🤖 CACHE MISS: Iniciando processamento de IA para hash: {}", event.fileHash());

        try {
            String content;
            String analysisResult;
            boolean isPdfOrImage = isBinaryFile(event.originalName());

            // 2. Estratégia de Extração
            if (isPdfOrImage) {
                log.info("📂 Arquivo Binário detectado (PDF/Imagem). Ignorando leitura de texto bruto por enquanto.");
                content = "[PDF/Imagem Original] - Conteúdo disponível no Storage.";
                
                // JSON placeholder para constar no banco
                analysisResult = """
                    {
                        "summary": "Documento PDF importado. Disponível para leitura e marcação.",
                        "tags": ["PDF", "Importado"],
                        "sentiment": "Neutro"
                    }
                """;
            } else {
                // É texto puro (.txt, .md)
                // MUDANÇA: Usamos o serviço agnóstico de storage
                content = downloadTextFromStorage(event.s3Key()); // 's3Key' aqui é apenas o path do arquivo
                
                // Corte de segurança
                if (content.length() > 2000) content = content.substring(0, 2000);
                
                log.info("🧠 Enviando texto para análise da OpenAI...");
                analysisResult = bookAssistant.analyzeText(content);
            }

            // 3. Salvar Cache no Redis
            redisTemplate.opsForValue().set(cacheKey, analysisResult, Duration.ofHours(24));
            
            log.info("✅ Sucesso IA. Iniciando persistência poliglota...");

            // 4. Persistência Relacional (Postgres)
            HighlightEntity savedEntity = null;
            
            if (!highlightRepository.existsByFileHash(event.fileHash())) {
                HighlightEntity entity = new HighlightEntity();
                entity.setFileHash(event.fileHash());
                entity.setUserId(event.userId());
                
                String safeContent = content.length() > 3900 ? content.substring(0, 3900) : content;
                entity.setOriginalText(safeContent); 
                entity.setAiAnalysisJson(analysisResult);
                
                savedEntity = highlightRepository.save(entity);
                log.info("💾 DADO SALVO NO BANCO RELACIONAL COM SUCESSO! ID: {}", savedEntity.getId());
            } else {
                log.warn("⚠️ Registro duplicado no banco detectado (Race condition evitada).");
                // Em um cenário real, recuperaríamos o ID do banco aqui se precisássemos usar abaixo
            }

            // 5. Persistência Vetorial (Pinecone - RAG)
            // Apenas para arquivos de texto simples. PDFs são vetorizados via Highlights (Fluxo 2).
            if (savedEntity != null && !isPdfOrImage) {
                log.info("▶️ Gerando Embedding do Documento para o Pinecone...");
                
                Metadata metadata = Metadata.from("userId", event.userId())
                                            .put("fileHash", event.fileHash())
                                            .put("source", event.originalName())
                                            .put("type", "document")
                                            .put("dbId", String.valueOf(savedEntity.getId()));

                TextSegment segment = TextSegment.from(content, metadata);
                Response<Embedding> embeddingResponse = embeddingModel.embed(segment);
                
                embeddingStore.addAll(
                    Collections.singletonList(embeddingResponse.content()),
                    Collections.singletonList(segment)
                );
                
                log.info("✅ VETOR DE DOCUMENTO SALVO NO PINECONE!");
            }
            
        } catch (Exception e) {
            log.error("Erro na tentativa de processamento de documento.", e);
            throw new RuntimeException("Erro de Processamento", e);
        }
    }

    /**
     * FLUXO 2: Processamento de Highlights (Marcações)
     * Chamado quando o usuário seleciona um trecho no PDFReader.
     */
    public void processHighlight(HighlightEvent event) {
        try {
            if ("TEXT".equalsIgnoreCase(event.type())) {
                log.info("🔍 Processando Highlight ID: {} (User: {})", event.highlightId(), event.userId());

                // 1. Prepara Metadados Ricos
                Metadata metadata = Metadata.from("userId", event.userId())
                        .put("fileHash", event.fileHash())
                        .put("type", "highlight")
                        .put("highlightId", String.valueOf(event.highlightId()));

                // 2. Cria o Segmento
                TextSegment segment = TextSegment.from(event.content(), metadata);

                // 3. Gera o Vetor (OpenAI)
                Response<Embedding> embeddingResponse = embeddingModel.embed(segment);

                // 4. Salva no Pinecone
                embeddingStore.addAll(
                    Collections.singletonList(embeddingResponse.content()),
                    Collections.singletonList(segment)
                );
                
                log.info("✅ HIGHLIGHT VETORIZADO NO PINECONE! ID Banco: {}", event.highlightId());
                
            } else {
                log.warn("⚠️ Processamento de imagem em highlight ainda não implementado.");
            }
        } catch (Exception e) {
            log.error("❌ Erro ao processar highlight: {}", e.getMessage(), e);
        }
    }

    /**
     * Fallback para o Fluxo 1
     */
    public void fallbackOpenAI(IngestionEvent event, Throwable t) {
        log.error("🔥 FALLBACK ATIVADO: OpenAI indisponível. Erro: {}", t.getMessage());
        
        String errorJson = """
            {
                "summary": "Processamento Suspenso (Serviço Externo Indisponível)",
                "tags": ["PENDENTE", "ERRO_EXTERNO"],
                "sentiment": "Neutro"
            }
            """;
            
        String cacheKey = "doc_analysis:" + event.fileHash();
        redisTemplate.opsForValue().set(cacheKey, errorJson, Duration.ofMinutes(5));
        
        log.warn("⚠️ Estado de erro salvo no Redis temporariamente.");
    }

    /**
     * Helper para baixar texto do Storage usando a abstração
     */
    private String downloadTextFromStorage(String storagePath) {
        log.debug("Baixando do Storage: {}", storagePath);
        
        // MUDANÇA: Usa a interface, não sabe se é S3 ou Google
        byte[] contentBytes = blobStorageService.download(storagePath);
        
        return new String(contentBytes, StandardCharsets.UTF_8);
    }

    private boolean isBinaryFile(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".pdf") || lower.endsWith(".jpg") || lower.endsWith(".png") || lower.endsWith(".jpeg");
    }
}