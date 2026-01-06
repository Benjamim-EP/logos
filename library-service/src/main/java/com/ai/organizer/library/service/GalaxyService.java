package com.ai.organizer.library.service;

import com.ai.organizer.library.client.AiProcessorClient;
import com.ai.organizer.library.client.dto.AiGravityResponse;
import com.ai.organizer.library.domain.StarGalaxyLink;
import com.ai.organizer.library.domain.UserGalaxy;
import com.ai.organizer.library.dto.CreateGalaxyRequest;
import com.ai.organizer.library.dto.GalaxyStateDTO;
import com.ai.organizer.library.repository.StarGalaxyLinkRepository;
import com.ai.organizer.library.repository.UserGalaxyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GalaxyService {

    private final UserGalaxyRepository galaxyRepository;
    private final StarGalaxyLinkRepository linkRepository;
    private final AiProcessorClient aiClient;

    /**
     * Cria uma nova Galáxia, registra no Pinecone para buscas futuras
     * e calcula a atração retroativa para estrelas já existentes.
     */
    @Transactional
    public UserGalaxy createGalaxy(String userId, CreateGalaxyRequest request) {
        log.info("🌌 Criando galáxia semântica: '{}' para o usuário: {}", request.name(), userId);

        // 1. Validação de Unicidade
        if (galaxyRepository.existsByUserIdAndNameIgnoreCase(userId, request.name())) {
            throw new IllegalArgumentException("Você já possui uma galáxia com este nome.");
        }

        // 2. Persistência no Banco Relacional (O Centro de Massa)
        UserGalaxy galaxyToSave = new UserGalaxy(
                request.name(),
                userId,
                request.color(),
                request.x(),
                request.y()
        );
        // Salvamos em variável final para uso seguro em lambdas/streams
        final UserGalaxy savedGalaxy = galaxyRepository.save(galaxyToSave);

        // --- NOVO: REGISTRO BIDIRECIONAL ---
        // 3. Registra a Galáxia no Pinecone (AI Processor)
        // Isso permite que NOVOS highlights (Shooting Stars) encontrem esta galáxia automaticamente.
        try {
            aiClient.registerGalaxy(String.valueOf(savedGalaxy.getId()), savedGalaxy.getName(), userId);
            log.info("📡 Galáxia registrada no Pinecone para busca reversa.");
        } catch (Exception e) {
            log.error("⚠️ Falha ao registrar galáxia no Pinecone (Shooting Stars podem falhar): {}", e.getMessage());
            // Não abortamos a transação, pois a galáxia visual ainda é válida
        }

        // 4. Busca Retroativa (Gravidade)
        // Pergunta à IA: "Quais estrelas JÁ EXISTENTES devem ser atraídas por esta nova galáxia?"
        AiGravityResponse aiResponse = aiClient.getGravityMatches(request.name());
        
        // 5. Persiste os Links encontrados
        if (aiResponse != null && aiResponse.matches() != null) {
            List<StarGalaxyLink> links = aiResponse.matches().stream()
                .filter(m -> m.highlightId() != null)
                .map(match -> new StarGalaxyLink(savedGalaxy, match.highlightId(), match.score()))
                .collect(Collectors.toList());

            // MUDANÇA AQUI: Tenta salvar um por um para não perder o lote todo se um falhar
            for (StarGalaxyLink link : links) {
                try {
                    // Verifica se já existe antes de salvar (Double Check)
                    // Ou apenas confia no try-catch do ConstraintViolation
                    linkRepository.save(link);
                } catch (Exception e) {
                    // Loga como WARN mas continua o processamento
                    log.warn("⚠️ Link já existente ignorado: Galáxia {} -> Estrela {}", savedGalaxy.getId(), link.getStarId());
                }
            }
            
            log.info("🧲 Galáxia '{}' processada com {} conexões potenciais.", savedGalaxy.getName(), links.size());
        }
// ...

        return savedGalaxy;
    }

    /**
     * Remove Galáxia e limpa o Mapa de Atração.
     * As estrelas não são apagadas, apenas "soltas" no espaço.
     */
    @Transactional
    public void deleteGalaxy(String userId, Long galaxyId) {
        UserGalaxy galaxy = galaxyRepository.findById(galaxyId)
                .orElseThrow(() -> new RuntimeException("Galáxia não encontrada"));

        if (!galaxy.getUserId().equals(userId)) {
            throw new RuntimeException("Ação não autorizada");
        }

        // 1. Remove os links de gravidade primeiro
        linkRepository.deleteByGalaxyId(galaxyId);
        
        // 2. Remove a galáxia do Postgres
        galaxyRepository.delete(galaxy);
        
        // Nota: Idealmente, deveríamos enviar um evento Kafka para remover a galáxia do Pinecone também,
        // mas como a busca reversa filtra por usuário, não é crítico deixar o vetor lá por enquanto.
        
        log.info("🗑️ Galáxia {} dissolvida e estrelas liberadas.", galaxyId);
    }

    @Transactional(readOnly = true)
    public List<UserGalaxy> getUserGalaxies(String userId) {
        return galaxyRepository.findByUserIdAndIsActiveTrue(userId);
    }

    /**
     * Recupera o Estado Total do Universo para o Motor Físico do Frontend.
     * Consolida Galáxias e Links de Gravidade em uma única chamada.
     */
    @Transactional(readOnly = true)
    public GalaxyStateDTO getUniverseState(String userId) {
        // 1. Busca Galáxias
        List<UserGalaxy> galaxies = galaxyRepository.findByUserIdAndIsActiveTrue(userId);
        
        // 2. Busca Links (Usando query otimizada do repositório)
        List<StarGalaxyLink> linksEntity = linkRepository.findByUserId(userId);

        // 3. Mapeia para DTO leve
        List<GalaxyStateDTO.LinkDTO> links = linksEntity.stream()
                .map(link -> new GalaxyStateDTO.LinkDTO(
                        String.valueOf(link.getGalaxy().getId()),
                        link.getStarId(), // ID unificado (ex: "123" ou "summary-456")
                        link.getScore()
                ))
                .toList();

        return new GalaxyStateDTO(galaxies, links);
    }
}