package com.ai.organizer.processor.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
@Slf4j
public class PdfTextExtractorService {

    private static final int MAX_CHARS = 30000; // Limite de custo/token

    public String extractTextFromRange(byte[] pdfBytes, int startPage, int endPage) throws IOException {
        log.info("📄 Extraindo texto das páginas {} a {}...", startPage, endPage);

        try (PDDocument document = PDDocument.load(pdfBytes)) {
            // Validação de páginas
            int totalPages = document.getNumberOfPages();
            if (startPage < 1 || endPage > totalPages || startPage > endPage) {
                throw new IllegalArgumentException("Intervalo de páginas inválido. O documento tem " + totalPages + " páginas.");
            }

            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(startPage);
            stripper.setEndPage(endPage);

            String text = stripper.getText(document);

            // Validação de Tamanho (Guard Clause)
            if (text.length() > MAX_CHARS) {
                throw new IllegalArgumentException("Texto muito longo (" + text.length() + " caracteres). O limite é " + MAX_CHARS + " para evitar custos excessivos.");
            }

            return text;
        }
    }
}