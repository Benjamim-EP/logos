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
import org.springframework.context.annotation.Primary;

import java.time.Duration;

@Configuration
public class AiConfig {

    // Carrega as variáveis do Docker Compose (Relaxed Binding do Spring)
    @Value("${ai.openai.api-key}")
    private String openAiApiKey;

    @Value("${ai.pinecone.api-key}")
    private String pineconeApiKey;

    @Value("${ai.pinecone.environment}")
    private String pineconeEnv;

    @Bean
    public ChatLanguageModel chatLanguageModel() {
        return OpenAiChatModel.builder()
                .apiKey(openAiApiKey)
                .modelName("gpt-4o-mini")
                .timeout(Duration.ofSeconds(60))
                .build();
    }

    @Bean
    public BookAssistant bookAssistant(ChatLanguageModel chatLanguageModel) {
        return AiServices.builder(BookAssistant.class)
                .chatLanguageModel(chatLanguageModel)
                .build();
    }

    @Bean
    public EmbeddingModel embeddingModel() {
        return OpenAiEmbeddingModel.builder()
                .apiKey(openAiApiKey)
                .modelName("text-embedding-3-small")
                .build();
    }

    @Bean(name = "userEmbeddingStore")
    @Primary 
    public EmbeddingStore<TextSegment> userEmbeddingStore() { 
        return PineconeEmbeddingStore.builder()
                .apiKey(pineconeApiKey)
                .environment(pineconeEnv)
                .projectId("c94c1e6") // ID do seu projeto no print do Pinecone
                .index("logos")       // Nome exato do seu índice no print
                .build();
    }

    @Bean(name = "publicEmbeddingStore")
    public EmbeddingStore<TextSegment> publicEmbeddingStore() {
        return PineconeEmbeddingStore.builder()
                .apiKey(pineconeApiKey)
                .environment(pineconeEnv)
                .projectId("c94c1e6")
                .metadataTextKey("text")
                .index("universes")
                .build();
    }

    @Bean(name = "guestEmbeddingStore")
    public EmbeddingStore<TextSegment> guestEmbeddingStore() {
        return PineconeEmbeddingStore.builder()
                .apiKey(pineconeApiKey)
                .environment(pineconeEnv)
                .projectId("c94c1e6")
                .index("guest-data")  // Nome exato no print
                .build();
    }
}