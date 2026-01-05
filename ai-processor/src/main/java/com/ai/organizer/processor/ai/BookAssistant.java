package com.ai.organizer.processor.ai;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.spring.AiService;

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

    @SystemMessage("""
        Você é um professor universitário especialista em didática.
        Sua tarefa é resumir o texto fornecido.
        
        Regras:
        1. Use formatação Markdown (negrito, listas).
        2. Estruture em Tópicos e Subtópicos claros.
        3. Seja explicativo mas conciso.
        4. Se o texto for muito técnico, simplifique a linguagem sem perder a precisão.
        """)
    String summarizeInTopics(@UserMessage String text);

    @SystemMessage("""
        Você é um analista de perfil cognitivo. Sua tarefa é analisar os trechos de estudo de um usuário e identificar 6 áreas de conhecimento dominantes.
        
        Regras:
        1. Retorne EXATAMENTE 6 objetos no array.
        2. Cada objeto deve ter 'subject' (nome da área) e 'A' (valor de 0 a 150).
        3. Use nomes de áreas curtos (máximo 15 caracteres).
        4. Responda apenas o JSON puro, sem markdown.
        
        Formato: [{"subject": "Java", "A": 120}, {"subject": "História", "A": 45}, ...]
        """)
    String generateKnowledgeRadar(@UserMessage String consolidatedText);
}