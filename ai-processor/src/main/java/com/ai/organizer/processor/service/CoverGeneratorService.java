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

    
    public byte[] generateCoverFromPdf(byte[] pdfBytes) {
        log.info("🎨 Gerando capa do documento (PDFBox)...");

        try (PDDocument document = PDDocument.load(pdfBytes)) {
           
            PDFRenderer pdfRenderer = new PDFRenderer(document);
            BufferedImage bim = pdfRenderer.renderImage(0, 1.5f, ImageType.RGB);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            

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
            return null;
        }
    }
}