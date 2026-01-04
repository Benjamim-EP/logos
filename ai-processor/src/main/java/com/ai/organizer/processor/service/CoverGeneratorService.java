package com.ai.organizer.processor.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
@Slf4j
public class CoverGeneratorService {

    /**
     * Recebe o binário do PDF e retorna o binário da imagem WebP.
     */
    public byte[] generateCoverFromPdf(byte[] pdfBytes) {
        log.info("🎨 Gerando capa do documento (PDFBox)...");

        try (PDDocument document = PDDocument.load(pdfBytes)) {
            // 1. Renderizador
            PDFRenderer pdfRenderer = new PDFRenderer(document);

            // 2. Renderiza a primeira página (índice 0)
            // Scale 1.0 = 72 DPI (Padrão). Usamos 1.5 (~108 DPI) para ficar nítido em telas retina, 
            // mas sem ficar gigante.
            BufferedImage bim = pdfRenderer.renderImage(0, 1.5f, ImageType.RGB);

            // 3. Converte para WebP
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            
            // O plugin TwelveMonkeys permite usar "webp" aqui
            boolean writerFound = ImageIO.write(bim, "webp", out);
            
            if (!writerFound) {
                log.warn("⚠️ Plugin WebP não encontrado. Caindo para PNG (maior tamanho).");
                ImageIO.write(bim, "png", out);
            }

            byte[] imageBytes = out.toByteArray();
            log.info("✅ Capa gerada com sucesso! Tamanho: {} KB", imageBytes.length / 1024);
            
            return imageBytes;

        } catch (IOException e) {
            log.error("❌ Falha ao renderizar capa do PDF", e);
            // Não queremos parar o processo de ingestão se a capa falhar
            // Retornamos null e o fluxo principal decide o que fazer
            return null;
        }
    }
}