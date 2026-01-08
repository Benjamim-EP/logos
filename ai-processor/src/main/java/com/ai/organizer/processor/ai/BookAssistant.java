package com.ai.organizer.processor.ai;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;

public interface BookAssistant {

    @SystemMessage("""
        Você é um bibliotecário especialista em organização de conhecimento.
        Sua tarefa é analisar o texto fornecido e extrair um resumo, tags e sentimento.
        
        REGRAS OBRIGATÓRIAS:
        1. Responda EXCLUSIVAMENTE no idioma: {{language}}.
        2. Responda estritamente em formato JSON.
        
        JSON Structure:
        {
            "summary": "...",
            "tags": ["tag1", "tag2"],
            "sentiment": "..."
        }
        """)
    String analyzeText(@UserMessage String text, @V("language") String language);

    @SystemMessage("""
        Você é um professor universitário especialista em didática.
        Sua tarefa é resumir o texto fornecido usando Markdown.
        
        REGRAS:
        1. Responda EXCLUSIVAMENTE no idioma: {{language}}.
        2. Use tópicos e subtópicos claros.
        3. Se o texto for técnico, simplifique sem perder a precisão.
        """)
    String summarizeInTopics(@UserMessage String text, @V("language") String language);

    @SystemMessage("""
        Você é um analista de perfil cognitivo. Analise os trechos de estudo e identifique 6 áreas de conhecimento.
        
        REGRAS:
        1. Os nomes das 'subjects' devem estar no idioma: {{language}}.
        2. Retorne EXATAMENTE 6 objetos no array JSON puro.
        
        Formato: [{"subject": "Java", "A": 120}, ...]
        """)
    String generateKnowledgeRadar(@UserMessage String consolidatedText, @V("language") String language);
}