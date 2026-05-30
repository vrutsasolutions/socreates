package com.ideaspark.controller;

import com.ideaspark.dto.IdeaDTO;
import com.ideaspark.service.IdeaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final IdeaService ideaService;

    // GET /api/search?q=keyword&category=Technology
    @GetMapping
    public ResponseEntity<List<IdeaDTO>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @AuthenticationPrincipal UserDetails user) {
        String email = user != null ? user.getUsername() : null;
        return ResponseEntity.ok(ideaService.search(q, category, email));
    }
}
