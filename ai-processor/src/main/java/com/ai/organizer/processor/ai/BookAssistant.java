package com.ai.organizer.processor.ai;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.spring.AiService;

@AiService // A Mágica do Spring: Ele injeta o ChatModel aqui
public interface BookAssistant {

    @SystemMessage("""
        Você é um bibliotecário especialista em organização de conhecimento.
        Sua tarefa é analisar o texto fornecido e extrair:
        1. Um resumo conciso (máx 2 frases).
        2. Três tags principais (temas).
        3. O sentimento do texto (Positivo, Neutro, Negativo).
        
        Responda estritamente em formato JSON:
        {
            "summary": "...",
            "tags": ["tag1", "tag2"],
            "sentiment": "..."
        }
        """)
    String analyzeText(@UserMessage String text);
}