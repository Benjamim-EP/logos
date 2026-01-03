package com.ai.organizer.library.service;

import java.net.URL;

public interface BlobStorageService {

    /**
     * Faz o upload de um arquivo para o bucket do Cloud Storage.
     * 
     * @param filename O caminho completo do arquivo (ex: uploads/hash/arquivo.pdf)
     * @param content O conteúdo binário do arquivo
     * @param contentType O tipo MIME (ex: application/pdf)
     */
    void upload(String filename, byte[] content, String contentType);

    /**
     * Baixa o conteúdo de um arquivo do Storage para a memória.
     * Útil para processamento interno (IA), mas evite usar para grandes arquivos no Library Service.
     * 
     * @param filename O caminho do arquivo no bucket
     * @return Os bytes do arquivo
     */
    byte[] download(String filename);

    /**
     * Gera uma URL assinada (V4 Signed URL) que permite acesso temporário a um objeto privado.
     * Fundamental para o Library Service permitir que o Frontend visualize o PDF.
     * 
     * @param filename O caminho do arquivo no bucket
     * @param minutesToExpire Tempo de vida do link em minutos
     * @return A URL pública temporária
     */
    URL getSignedUrl(String filename, int minutesToExpire);
}