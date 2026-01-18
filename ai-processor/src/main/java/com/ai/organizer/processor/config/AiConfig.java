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
    @Bean
    public ChatLanguageModel chatLanguageModel(
            @Value("${ai.openai.api-key}") String apiKey,
            @Value("${ai.openai.model-name:gpt-4o-mini}") String modelName) {
        
        return OpenAiChatModel.builder()
                .apiKey(apiKey)
                .modelName(modelName)
                .timeout(Duration.ofSeconds(60))
                .logRequests(true)
                .logResponses(true)
                .build();
    }

    @Bean
    public BookAssistant bookAssistant(ChatLanguageModel chatLanguageModel) {
        return AiServices.builder(BookAssistant.class)
                .chatLanguageModel(chatLanguageModel)
                .build();
    }

    @Bean
    public EmbeddingModel embeddingModel(@Value("${ai.openai.api-key}") String apiKey) {
        return OpenAiEmbeddingModel.builder()
                .apiKey(apiKey)
                .modelName("text-embedding-3-small")
                .build();
    }

    @Bean(name = "userEmbeddingStore")
    @Primary 
    public EmbeddingStore<TextSegment> userEmbeddingStore(
            @Value("${ai.pinecone.api-key}") String apiKey,
            @Value("${ai.pinecone.environment:us-east-1}") String environment,
            @Value("${ai.pinecone.index-name:logos}") String indexName) { 
        
        return PineconeEmbeddingStore.builder()
                .apiKey(apiKey)
                .environment(environment)
                .projectId("c94c1e6")
                .index(indexName)
                .build();
    }

    @Bean(name = "publicEmbeddingStore")
    public EmbeddingStore<TextSegment> publicEmbeddingStore(
            @Value("${ai.pinecone.api-key}") String apiKey,
            @Value("${ai.pinecone.environment:us-east-1}") String environment) {
        
        return PineconeEmbeddingStore.builder()
                .apiKey(apiKey)
                .environment(environment)
                .projectId("c94c1e6")
                .index("universes")
                .nameSpace("")
                .metadataTextKey("text")
                .build();
    }
}