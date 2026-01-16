package com.ai.organizer.library.controller;

import com.ai.organizer.library.domain.PublicUniverse;
import com.ai.organizer.library.repository.PublicUniverseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/universes")
@RequiredArgsConstructor
public class PublicUniverseController {

    private final PublicUniverseRepository repository;

    @GetMapping
    public List<PublicUniverse> getAvailableUniverses() {
        return repository.findByIsActiveTrue();
    }
}