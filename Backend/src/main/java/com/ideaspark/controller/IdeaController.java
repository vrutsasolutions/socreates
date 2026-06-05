package com.ideaspark.controller;

import com.ideaspark.dto.*;
import com.ideaspark.service.IdeaService;
import com.ideaspark.service.LocalFileStorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ideas")
@RequiredArgsConstructor
public class IdeaController {

    private final IdeaService ideaService;
    private final ObjectMapper objectMapper;
    private final LocalFileStorageService fileStorageService;

    private ResponseEntity<ApiResponse> unauthenticated() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiResponse(false, "User not authenticated"));
    }

    @GetMapping
    public ResponseEntity<List<IdeaDTO>> getAll(
            @RequestParam(required = false) String sort,
            @AuthenticationPrincipal UserDetails user) {

        String email = user != null ? user.getUsername() : null;
        return ResponseEntity.ok(ideaService.getAllIdeas(sort, email));
    }

    @GetMapping("/premium")
    public ResponseEntity<?> getPremium(@AuthenticationPrincipal UserDetails user) {
        if (user == null) {
            return unauthenticated();
        }
        return ResponseEntity.ok(ideaService.getPremiumIdeas(user.getUsername()));
    }

    @GetMapping("/mine")
    public ResponseEntity<?> getMyIdeas(@AuthenticationPrincipal UserDetails user) {
        if (user == null) {
            return unauthenticated();
        }
        return ResponseEntity.ok(ideaService.getMyIdeas(user.getUsername()));
    }

    @GetMapping("/saved")
    public ResponseEntity<?> getSaved(@AuthenticationPrincipal UserDetails user) {
        if (user == null) {
            return unauthenticated();
        }
        return ResponseEntity.ok(ideaService.getSavedIdeas(user.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<IdeaDTO> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {

        String email = user != null ? user.getUsername() : null;
        return ResponseEntity.ok(ideaService.getById(id, email));
    }

    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<?> create(
            @RequestPart("idea") String ideaJson,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @AuthenticationPrincipal UserDetails user) throws Exception {

        if (user == null) {
            return unauthenticated();
        }

        System.out.println("ideaJson = " + ideaJson);

        CreateIdeaRequest req = objectMapper.readValue(ideaJson, CreateIdeaRequest.class);

        String imageUrl = null;

        if (image != null && !image.isEmpty()) {
            imageUrl = fileStorageService.upload(image);
        }

        return ResponseEntity.ok(
                ideaService.createIdea(req, imageUrl, user.getUsername())
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {

        if (user == null) {
            return unauthenticated();
        }

        ideaService.deleteIdea(id, user.getUsername());
        return ResponseEntity.ok(new ApiResponse(true, "Idea deleted"));
    }

    @PostMapping("/{id}/save")
    public ResponseEntity<ApiResponse> save(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {

        if (user == null) {
            return unauthenticated();
        }

        ideaService.saveIdea(id, user.getUsername());
        return ResponseEntity.ok(new ApiResponse(true, "Idea saved"));
    }

    @DeleteMapping("/{id}/save")
    public ResponseEntity<ApiResponse> unsave(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {

        if (user == null) {
            return unauthenticated();
        }

        ideaService.unsaveIdea(id, user.getUsername());
        return ResponseEntity.ok(new ApiResponse(true, "Idea unsaved"));
    }

    @DeleteMapping("/{id}/like")
    public ResponseEntity<ApiResponse> unlike(
            @PathVariable UUID id,
            Authentication authentication) {

        if (authentication == null) {
            return unauthenticated();
        }

        ideaService.unlikeIdea(id, authentication.getName());
        return ResponseEntity.ok(new ApiResponse(true, "Unliked"));
    }

    
    }

