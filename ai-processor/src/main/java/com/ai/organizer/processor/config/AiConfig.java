package com.ai.organizer.processor.config;

import com.ai.organizer.processor.ai.BookAssistant;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.pinecone.PineconeEmbeddingStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class AiConfig {

    // --- 1. CHAT MODEL (O Cérebro - GPT-4o-mini) ---
    @Bean
    public ChatLanguageModel chatLanguageModel(
            @Value("${ai.openai.api-key}") String apiKey,
            @Value("${ai.openai.model-name:gpt-4o-mini}") String modelName) {
        
        return OpenAiChatModel.builder()
                .apiKey(apiKey)
                .modelName(modelName)
                .timeout(Duration.ofSeconds(60)) // Aumentei o timeout para evitar cortes
                .logRequests(true)  // Loga o que mandamos para a OpenAI (Debug)
                .logResponses(true) // Loga o que a OpenAI respondeu (Debug)
                .build();
    }

    // --- 2. AI SERVICE (O Assistente Declarativo) ---
    // Criamos manualmente via AiServices.create() para garantir a injeção correta
    @Bean
    public BookAssistant bookAssistant(ChatLanguageModel chatLanguageModel) {
        return AiServices.builder(BookAssistant.class)
                .chatLanguageModel(chatLanguageModel)
                .build();
    }

    // --- 3. EMBEDDING MODEL (Gerador de Vetores) ---
    @Bean
    public EmbeddingModel embeddingModel(@Value("${ai.openai.api-key}") String apiKey) {
        return OpenAiEmbeddingModel.builder()
                .apiKey(apiKey)
                .modelName("text-embedding-3-small")
                .build();
    }

    // --- 4. EMBEDDING STORE (Pinecone DB) ---
    @Bean
    public EmbeddingStore<TextSegment> embeddingStore(
            @Value("${ai.pinecone.api-key}") String apiKey,
            @Value("${ai.pinecone.environment:us-east-1}") String environment,
            @Value("${ai.pinecone.index-name}") String indexName) {
        
        return PineconeEmbeddingStore.builder()
                .apiKey(apiKey)
                .environment(environment)
                .index(indexName)
                .build();
    }
}