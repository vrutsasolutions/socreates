package com.ideaspark.controller;

import com.ideaspark.dto.*;
import com.ideaspark.service.IdeaService;
import org.springframework.beans.factory.annotation.Autowired;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ideas")
@RequiredArgsConstructor
public class IdeaController {

    @Autowired
    private IdeaService ideaService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // GET /api/ideas?sort=trending|latest|recommended
    @GetMapping
    public ResponseEntity<List<IdeaDTO>> getAll(
            @RequestParam(required = false) String sort,
            @AuthenticationPrincipal UserDetails user) {
        String email = user != null ? user.getUsername() : null;
        return ResponseEntity.ok(ideaService.getAllIdeas(sort, email));
    }

    // GET /api/ideas/premium
    @GetMapping("/premium")
    public ResponseEntity<List<IdeaDTO>> getPremium(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ideaService.getPremiumIdeas(user.getUsername()));
    }

    // GET /api/ideas/mine
    @GetMapping("/mine")
    public ResponseEntity<List<IdeaDTO>> getMyIdeas(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ideaService.getMyIdeas(user.getUsername()));
    }

    // GET /api/ideas/saved
    @GetMapping("/saved")
    public ResponseEntity<List<IdeaDTO>> getSaved(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ideaService.getSavedIdeas(user.getUsername()));
    }

    // GET /api/ideas/{id}
    @GetMapping("/{id}")
    public ResponseEntity<IdeaDTO> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        String email = user != null ? user.getUsername() : null;
        return ResponseEntity.ok(ideaService.getById(id, email));
    }

    // POST /api/ideas  (multipart: idea JSON + optional image file)
    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<IdeaDTO> create(
            @RequestPart("idea") String ideaJson,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @AuthenticationPrincipal UserDetails user) throws Exception {

        CreateIdeaRequest req = objectMapper.readValue(ideaJson, CreateIdeaRequest.class);

        // For now store image filename — replace with Cloudflare R2 upload later
        String imageUrl = null;
        if (image != null && !image.isEmpty()) {
            imageUrl = "/uploads/" + image.getOriginalFilename();
        }

        return ResponseEntity.ok(ideaService.createIdea(req, imageUrl, user.getUsername()));
    }

    // DELETE /api/ideas/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        ideaService.deleteIdea(id, user.getUsername());
        return ResponseEntity.ok(new ApiResponse(true, "Idea deleted"));
    }

    // POST /api/ideas/{id}/save
    @PostMapping("/{id}/save")
    public ResponseEntity<ApiResponse> save(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        ideaService.saveIdea(id, user.getUsername());
        return ResponseEntity.ok(new ApiResponse(true, "Idea saved"));
    }

    // DELETE /api/ideas/{id}/save
    @DeleteMapping("/{id}/save")
    public ResponseEntity<ApiResponse> unsave(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {
        ideaService.unsaveIdea(id, user.getUsername());
        return ResponseEntity.ok(new ApiResponse(true, "Idea unsaved"));
    }

    // POST /api/ideas/{id}/like
    @PostMapping("/{id}/like")
    public ResponseEntity<?> likeIdea(
            @PathVariable UUID id,
            Authentication authentication) {

        ideaService.likeIdea(id, authentication.getName());

        return ResponseEntity.ok().build();
    }

    // DELETE /api/ideas/{id}/like
    @DeleteMapping("/{id}/like")
    public ResponseEntity<ApiResponse> unlike(@PathVariable UUID id) {
        ideaService.unlikeIdea(id);
        return ResponseEntity.ok(new ApiResponse(true, "Unliked"));
    }
}
