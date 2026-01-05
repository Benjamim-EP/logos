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
    // Removido kafkaTemplate não utilizado para limpar warnings

    @Transactional
    public UserGalaxy createGalaxy(String userId, CreateGalaxyRequest request) {
        log.info("🌌 Criando galáxia semântica: '{}' para o usuário: {}", request.name(), userId);

        if (galaxyRepository.existsByUserIdAndNameIgnoreCase(userId, request.name())) {
            throw new IllegalArgumentException("Você já possui uma galáxia com este nome.");
        }

        // 1. Criamos a instância inicial
        UserGalaxy galaxyToSave = new UserGalaxy(
                request.name(),
                userId,
                request.color(),
                request.x(),
                request.y()
        );

        // 2. CORREÇÃO: Salvamos em uma NOVA variável final para o Java não reclamar no Stream
        final UserGalaxy savedGalaxy = galaxyRepository.save(galaxyToSave);

        // 3. Busca no Pinecone
        AiGravityResponse aiResponse = aiClient.getGravityMatches(request.name());
        
        // 4. Cria Links de Gravidade usando a variável final 'savedGalaxy'
        if (aiResponse != null && aiResponse.matches() != null) {
            List<StarGalaxyLink> links = aiResponse.matches().stream()
                .filter(m -> m.highlightId() != null)
                .map(match -> new StarGalaxyLink(savedGalaxy, match.highlightId(), match.score()))
                .collect(Collectors.toList());

            linkRepository.saveAll(links);
            log.info("🧲 Galáxia '{}' vinculada a {} objetos estelares.", 
                     savedGalaxy.getName(), links.size());
        }

        return savedGalaxy;
    }

    @Transactional
    public void deleteGalaxy(String userId, Long galaxyId) {
        UserGalaxy galaxy = galaxyRepository.findById(galaxyId)
                .orElseThrow(() -> new RuntimeException("Galáxia não encontrada"));

        if (!galaxy.getUserId().equals(userId)) {
            throw new RuntimeException("Ação não autorizada");
        }

        linkRepository.deleteByGalaxyId(galaxyId);
        galaxyRepository.delete(galaxy);
        
        log.info("🗑️ Galáxia {} dissolvida e estrelas liberadas.", galaxyId);
    }

    @Transactional(readOnly = true)
    public List<UserGalaxy> getUserGalaxies(String userId) {
        return galaxyRepository.findByUserIdAndIsActiveTrue(userId);
    }

    @Transactional(readOnly = true)
    public GalaxyStateDTO getUniverseState(String userId) {
        // 1. Busca as Galáxias do usuário
        List<UserGalaxy> galaxies = galaxyRepository.findByUserIdAndIsActiveTrue(userId);
        
        // 2. Busca os Links do usuário (usando a nova query do repo)
        List<StarGalaxyLink> linksEntity = linkRepository.findByUserId(userId);

        // 3. Mapeia para DTO
        List<GalaxyStateDTO.LinkDTO> links = linksEntity.stream()
                .map(link -> new GalaxyStateDTO.LinkDTO(
                        String.valueOf(link.getGalaxy().getId()),
                        link.getStarId(), 
                        link.getScore()
                ))
                .toList();

        return new GalaxyStateDTO(galaxies, links);
    }
}