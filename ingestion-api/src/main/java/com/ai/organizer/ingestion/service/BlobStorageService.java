package com.ai.organizer.ingestion.service; // Ajuste o pacote

import java.net.URL;

public interface BlobStorageService {
    // Sobe o arquivo e retorna o caminho/ID
    void upload(String filename, byte[] content, String contentType);
    
    // Baixa o conteúdo (para a IA processar)
    byte[] download(String filename);
    
    // Gera link temporário para o Frontend (O Pulo do Gato)
    URL getSignedUrl(String filename, int minutesToExpire);
}