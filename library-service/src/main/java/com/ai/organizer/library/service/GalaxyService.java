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

    @Transactional
    public UserGalaxy createGalaxy(String userId, CreateGalaxyRequest request) {
        log.info("🌌 Criando galáxia semântica: '{}' para o usuário: {}", request.name(), userId);

        if (galaxyRepository.existsByUserIdAndNameIgnoreCase(userId, request.name())) {
            throw new IllegalArgumentException("Você já possui uma galáxia com este nome.");
        }

        UserGalaxy galaxyToSave = new UserGalaxy(
                request.name(),
                userId,
                request.color(),
                request.x(),
                request.y()
        );
        final UserGalaxy savedGalaxy = galaxyRepository.save(galaxyToSave);

        try {
            aiClient.registerGalaxy(String.valueOf(savedGalaxy.getId()), savedGalaxy.getName(), userId);
            log.info("📡 Galáxia registrada no Pinecone para busca reversa.");
        } catch (Exception e) {
            log.error("⚠️ Falha ao registrar galáxia no Pinecone (Shooting Stars podem falhar): {}", e.getMessage());
        }

        AiGravityResponse aiResponse = aiClient.getGravityMatches(request.name());
        
        if (aiResponse != null && aiResponse.matches() != null) {
            List<StarGalaxyLink> links = aiResponse.matches().stream()
                .filter(m -> m.highlightId() != null)
                .map(match -> new StarGalaxyLink(savedGalaxy, match.highlightId(), match.score()))
                .collect(Collectors.toList());

            for (StarGalaxyLink link : links) {
                try {
                    linkRepository.save(link);
                } catch (Exception e) {
                    log.warn("⚠️ Link já existente ignorado: Galáxia {} -> Estrela {}", savedGalaxy.getId(), link.getStarId());
                }
            }
            
            log.info("🧲 Galáxia '{}' processada com {} conexões potenciais.", savedGalaxy.getName(), links.size());
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

        List<UserGalaxy> galaxies = galaxyRepository.findByUserIdAndIsActiveTrue(userId);
        
        List<StarGalaxyLink> linksEntity = linkRepository.findByUserId(userId);

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