package com.ai.organizer.library.service;

import com.ai.organizer.library.client.AiProcessorClient;
import com.ai.organizer.library.client.dto.AiGravityResponse;
import com.ai.organizer.library.domain.StarGalaxyLink;
import com.ai.organizer.library.domain.UserGalaxy;
import com.ai.organizer.library.dto.CreateGalaxyRequest;
import com.ai.organizer.library.dto.GalaxyStateDTO;
import com.ai.organizer.library.repository.StarGalaxyLinkRepository;
import com.ai.organizer.library.repository.UserGalaxyRepository;
import com.ai.organizer.library.repository.UserHighlightRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class GalaxyService {

    private final UserGalaxyRepository galaxyRepository;
    private final StarGalaxyLinkRepository linkRepository;
    private final UserHighlightRepository highlightRepository;
    private final AiProcessorClient aiClient;

    /**
     * CRIA GALÁXIA E REORDENA AS ESTRELAS (GRAVIDADE REAL)
     */
    @Transactional
    public UserGalaxy createGalaxy(String userId, CreateGalaxyRequest request) {
        log.info("🌌 Big Bang: Criando galáxia '{}' e aplicando gravidade...", request.name());

        if (galaxyRepository.existsByUserIdAndNameIgnoreCase(userId, request.name())) {
            throw new IllegalArgumentException("Já existe uma galáxia com este nome.");
        }

        // 1. Salva a Entidade Galáxia (O Centro de Gravidade)
        UserGalaxy galaxy = new UserGalaxy(
                request.name(),
                userId,
                request.color(),
                request.x(),
                request.y()
        );
        galaxy = galaxyRepository.save(galaxy);

        // 2. Chama a IA para calcular a atração
        // O AI Processor vai vetorizar o NOME da galáxia e buscar highlights próximos no Pinecone
        AiGravityResponse aiResponse = aiClient.getGravityMatches(request.name());
        
        // 3. Cria os Links (A corda que puxa a estrela)
        if (aiResponse != null && !aiResponse.matches().isEmpty()) {
            List<StarGalaxyLink> links = new ArrayList<>();
            
            for (AiGravityResponse.StarMatch match : aiResponse.matches()) {
                // Tenta encontrar o highlight no banco
                // Se o Pinecone tiver IDs velhos que não estão no Postgres, ignoramos (safe)
                if (highlightRepository.existsById(Long.valueOf(match.highlightId()))) {
                    var highlightProxy = highlightRepository.getReferenceById(Long.valueOf(match.highlightId()));
                    links.add(new StarGalaxyLink(galaxy, highlightProxy, match.score()));
                }
            }

            linkRepository.saveAll(links);
            log.info("🧲 Reordenação: {} estrelas foram atraídas pela nova galáxia '{}'", links.size(), galaxy.getName());
        }

        return galaxy;
    }

    /**
     * DELETAR GALÁXIA (SOLTAR AS ESTRELAS)
     */
    @Transactional
    public void deleteGalaxy(String userId, Long galaxyId) {
        log.info("💥 Supernova: Removendo galáxia ID {}", galaxyId);
        
        UserGalaxy galaxy = galaxyRepository.findById(galaxyId)
                .orElseThrow(() -> new RuntimeException("Galáxia não encontrada"));

        if (!galaxy.getUserId().equals(userId)) {
            throw new RuntimeException("Acesso negado");
        }

        // 1. Remove os Links (As estrelas ficam "soltas" e voltam para a posição original/caos)
        // O Cascade do JPA poderia fazer isso, mas delete explícito é mais seguro aqui
        linkRepository.deleteByGalaxyId(galaxyId);

        // 2. Remove a Galáxia
        galaxyRepository.delete(galaxy);
        
        log.info("✅ Galáxia removida. As estrelas foram liberadas.");
    }
    
    // ... (Métodos getUserGalaxies e getUniverseState mantidos iguais) ...
    @Transactional(readOnly = true)
    public List<UserGalaxy> getUserGalaxies(String userId) {
        return galaxyRepository.findByUserIdAndIsActiveTrue(userId);
    }

    @Transactional(readOnly = true)
    public GalaxyStateDTO getUniverseState(String userId) {
        List<UserGalaxy> galaxies = galaxyRepository.findByUserIdAndIsActiveTrue(userId);
        var linksEntity = linkRepository.findAllActiveLinksByUserId(userId);

        List<GalaxyStateDTO.LinkDTO> links = linksEntity.stream()
                .map(link -> new GalaxyStateDTO.LinkDTO(
                        String.valueOf(link.getGalaxy().getId()),
                        String.valueOf(link.getHighlight().getId()),
                        link.getScore()
                ))
                .toList();

        return new GalaxyStateDTO(galaxies, links);
    }
}