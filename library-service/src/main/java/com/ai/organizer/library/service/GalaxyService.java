// library-service/src/main/java/com/ai/organizer/library/service/GalaxyService.java

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

    @Transactional
    public UserGalaxy createGalaxy(String userId, CreateGalaxyRequest request) {
        log.info("🌌 Criando nova galáxia '{}' para user {}", request.name(), userId);

        // 1. Validação
        if (galaxyRepository.existsByUserIdAndNameIgnoreCase(userId, request.name())) {
            throw new IllegalArgumentException("Você já possui uma galáxia com este nome.");
        }

        // 2. Persistir o Container (A Galáxia)
        UserGalaxy galaxy = new UserGalaxy(
                request.name(),
                userId,
                request.color(),
                request.x(),
                request.y()
        );
        galaxy = galaxyRepository.save(galaxy);

        // 3. Consultar a IA (Externo)
        AiGravityResponse aiResponse = aiClient.getGravityMatches(request.name());
        
        // 4. Batch Insert dos Links (Performance)
        if (aiResponse != null && !aiResponse.matches().isEmpty()) {
            List<StarGalaxyLink> links = new ArrayList<>();
            
            for (AiGravityResponse.StarMatch match : aiResponse.matches()) {
                // OTIMIZAÇÃO: getReferenceById cria um Proxy (não vai ao banco buscar a estrela inteira)
                // Só precisamos do ID para fazer a chave estrangeira na tabela de link.
                var highlightProxy = highlightRepository.getReferenceById(Long.valueOf(match.highlightId()));
                
                links.add(new StarGalaxyLink(galaxy, highlightProxy, match.score()));
            }

            linkRepository.saveAll(links); // Hibernate faz batch insert aqui
            log.info("🧲 {} estrelas conectadas à galáxia {}", links.size(), galaxy.getName());
        }

        return galaxy;
    }
    
    // Método para recuperar o estado completo (Fase 1.2)
    @Transactional(readOnly = true)
    public List<UserGalaxy> getUserGalaxies(String userId) {
        return galaxyRepository.findByUserIdAndIsActiveTrue(userId);
    }

    @Transactional(readOnly = true)
    public GalaxyStateDTO getUniverseState(String userId) {
        // 1. Busca as Galáxias
        List<UserGalaxy> galaxies = galaxyRepository.findByUserIdAndIsActiveTrue(userId);

        // 2. Busca os Links (Usando a query otimizada FETCH JOIN que criamos no passo anterior)
        var linksEntity = linkRepository.findAllActiveLinksByUserId(userId);

        // 3. Converte Links para DTO leve
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