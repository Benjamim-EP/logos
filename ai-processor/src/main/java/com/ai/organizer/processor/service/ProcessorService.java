package com.ai.organizer.processor.service;

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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProcessorService {

    // --- Injeção de Dependências ---
    private final BookAssistant bookAssistant;          // Interface IA (Chat)
    private final StringRedisTemplate redisTemplate;    // Cache
    private final S3Client s3Client;                    // Storage (MinIO)
    private final HighlightRepository highlightRepository; // Banco Relacional
    private final EmbeddingModel embeddingModel;        // Gerador de Vetores
    private final EmbeddingStore<TextSegment> embeddingStore; // Banco Vetorial

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    /**
     * Processamento principal do documento.
     * Protegido por Circuit Breaker e Retry para resiliência.
     */
    @CircuitBreaker(name = "openai", fallbackMethod = "fallbackOpenAI")
    @Retry(name = "openai")
    public void processDocument(IngestionEvent event) {
        String cacheKey = "doc_analysis:" + event.fileHash();

        // 1. FinOps: Verifica se já processamos esse arquivo antes
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cacheKey))) {
            log.info("💰 CACHE HIT: Documento já processado. Poupando recursos.");
            return; 
        }

        log.info("🤖 Iniciando processamento para: {}", event.originalName());

        try {
            String content;
            String analysisResult;
            boolean isBinary = isBinaryFile(event.originalName());

            // --- LÓGICA CONDICIONAL DE PROCESSAMENTO ---
            if (isBinary) {
                // CAMINHO A: PDF/Imagem
                // Não baixamos o conteúdo como texto para evitar erros de encoding.
                // Apenas registramos no banco para aparecer na Biblioteca.
                log.info("📂 Arquivo Binário (PDF/Imagem) detectado. Criando registro na Biblioteca (IA adiada).");
                
                content = "[Arquivo Original Disponível no Storage] - " + event.originalName();
                
                // JSON Placeholder para o Frontend não quebrar
                analysisResult = """
                    {
                        "summary": "Documento importado com sucesso. Leitura disponível.",
                        "tags": ["PDF", "Importado"],
                        "sentiment": "Neutro"
                    }
                """;

            } else {
                // CAMINHO B: Arquivo de Texto (.txt, .md, etc)
                // Baixamos e processamos com IA imediatamente.
                log.info("📝 Arquivo de Texto detectado. Iniciando análise completa...");
                
                content = downloadTextFromS3(event.s3Key());
                
                // Corte de segurança (Tokens)
                if (content.length() > 3000) {
                    content = content.substring(0, 3000); 
                }

                log.info("🧠 Enviando para OpenAI...");
                analysisResult = bookAssistant.analyzeText(content);
            }

            // --- PERSISTÊNCIA RELACIONAL (Oracle/Postgres) ---
            // Salvamos sempre, independente do tipo, para o usuário ver na estante.
            HighlightEntity savedEntity = null;
            
            if (!highlightRepository.existsByFileHash(event.fileHash())) {
                HighlightEntity entity = new HighlightEntity();
                entity.setFileHash(event.fileHash());
                entity.setUserId(event.userId());
                
                String safeContent = content.length() > 3900 ? content.substring(0, 3900) : content;
                entity.setOriginalText(safeContent); 
                entity.setAiAnalysisJson(analysisResult);
                
                savedEntity = highlightRepository.save(entity);
                log.info("💾 DADO SALVO NO BANCO RELACIONAL! ID: {}", savedEntity.getId());
            } else {
                log.warn("⚠️ Registro duplicado no banco. Pulando inserção.");
            }

            // --- PERSISTÊNCIA VETORIAL (Pinecone) ---
            // Só geramos vetor se for Texto (pois ainda não lemos o conteúdo do PDF)
            // e se o salvamento no banco deu certo.
            if (savedEntity != null && !isBinary) {
                log.info("▶️ Gerando Embedding para o Pinecone...");
                
                Metadata metadata = Metadata.from("userId", event.userId())
                                            .add("fileHash", event.fileHash())
                                            .add("source", event.originalName())
                                            .add("dbId", String.valueOf(savedEntity.getId()));

                TextSegment segment = TextSegment.from(content, metadata);
                Response<Embedding> embeddingResponse = embeddingModel.embed(segment);
                
                // Salva no Pinecone usando o ID do Banco Relacional como chave
                embeddingStore.add(String.valueOf(savedEntity.getId()), embeddingResponse.content());
                
                log.info("✅ VETOR SALVO NO PINECONE!");
            }

            // Atualiza Cache
            redisTemplate.opsForValue().set(cacheKey, analysisResult, Duration.ofHours(24));
            
        } catch (Exception e) {
            log.error("Erro no processamento.", e);
            // Re-lança para o Resilience4j pegar e tentar de novo (Retry)
            throw new RuntimeException("Erro de Processamento", e);
        }
    }

    // --- FALLBACK (Plano B) ---
    public void fallbackOpenAI(IngestionEvent event, Throwable t) {
        log.error("🔥 FALLBACK ATIVADO: Erro crítico ou timeout. Motivo: {}", t.getMessage());
        
        String errorJson = """
            {
                "summary": "Processamento Pendente (Serviço Indisponível)",
                "tags": ["ERRO", "PENDENTE"],
                "sentiment": "Neutro"
            }
            """;
            
        String cacheKey = "doc_analysis:" + event.fileHash();
        redisTemplate.opsForValue().set(cacheKey, errorJson, Duration.ofMinutes(5));
        log.warn("⚠️ Estado de erro salvo no Redis.");
    }

    private String downloadTextFromS3(String key) {
        // Baixa o objeto como bytes e converte para String UTF-8
        ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build());
        return new String(objectBytes.asByteArray(), StandardCharsets.UTF_8);
    }

    private boolean isBinaryFile(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".pdf") || 
               lower.endsWith(".jpg") || 
               lower.endsWith(".jpeg") || 
               lower.endsWith(".png") ||
               lower.endsWith(".zip");
    }
}