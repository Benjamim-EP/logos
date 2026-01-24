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

    @Value("${ai.openai.api-key}")
    private String openAiApiKey;

    @Value("${ai.pinecone.api-key}")
    private String pineconeApiKey;

    // Usaremos essa base apenas para o índice 'logos'
    @Value("${ai.pinecone.base-url}")
    private String pineconeBaseUrl; 

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
                .environment("us-east-1")
                .projectId("c94c1e6")
                .index("logos")
                .build();
    }

    @Bean(name = "publicEmbeddingStore")
    public EmbeddingStore<TextSegment> publicEmbeddingStore() {
        // VAMOS FORÇAR O HOST DIRETO DO SEU PRINT PARA TESTAR
        return PineconeEmbeddingStore.builder()
                .apiKey(pineconeApiKey)
                .index("universes") // URL exata do print
                .metadataTextKey("text")
                .build();
    }

    @Bean(name = "guestEmbeddingStore")
    public EmbeddingStore<TextSegment> guestEmbeddingStore() {
        // VAMOS FORÇAR O HOST DIRETO DO SEU PRINT PARA TESTAR
        return PineconeEmbeddingStore.builder()
                .apiKey(pineconeApiKey)
                .index("guest-data") // URL exata do print
                .build();
    }
}