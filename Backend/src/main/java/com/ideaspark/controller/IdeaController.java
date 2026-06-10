package com.ideaspark.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ideaspark.dto.*;
import com.ideaspark.service.CloudflareImageService;
import com.ideaspark.service.IdeaService;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ideas")
@RequiredArgsConstructor
public class IdeaController {

    private final IdeaService ideaService;
    private final ObjectMapper objectMapper;
    private final CloudflareImageService cloudflareImageService;

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
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal UserDetails user) throws Exception {

        if (user == null) {
            return unauthenticated();
        }

        System.out.println("ideaJson = " + ideaJson);

        CreateIdeaRequest req = objectMapper.readValue(ideaJson, CreateIdeaRequest.class);

        List<String> imageUrls = new ArrayList<>();

        if (images != null && !images.isEmpty()) {
            for (MultipartFile img : images) {
                if (img != null && !img.isEmpty()) {
                    imageUrls.add(cloudflareImageService.upload(img));
                }
            }
        }

        String firstImageUrl = imageUrls.isEmpty() ? null : imageUrls.get(0);

        return ResponseEntity.ok(
                ideaService.createIdea(req, firstImageUrl, imageUrls, user.getUsername())
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

    @PostMapping("/{id}/like")
    public ResponseEntity<ApiResponse> likeIdea(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {

        if (user == null) {
            return unauthenticated();
        }

        ideaService.likeIdea(id, user.getUsername());
        return ResponseEntity.ok(new ApiResponse(true, "Liked"));
    }

    @DeleteMapping("/{id}/like")
    public ResponseEntity<ApiResponse> unlike(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails user) {

        if (user == null) {
            return unauthenticated();
        }

        ideaService.unlikeIdea(id, user.getUsername());
        return ResponseEntity.ok(new ApiResponse(true, "Unliked"));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<?> addComment(
            @PathVariable UUID id,
            @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal UserDetails user) {

        if (user == null) {
            return unauthenticated();
        }

        CommentDTO comment = ideaService.addComment(
                id,
                request,
                user.getUsername()
        );

        return ResponseEntity.ok(comment);
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<CommentDTO>> getComments(
            @PathVariable UUID id) {

        return ResponseEntity.ok(
                ideaService.getComments(id)
        );
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse> deleteComment(
            @PathVariable UUID commentId,
            @AuthenticationPrincipal UserDetails user) {

        if (user == null) {
            return unauthenticated();
        }

        ideaService.deleteComment(
                commentId,
                user.getUsername()
        );

        return ResponseEntity.ok(
                new ApiResponse(true, "Comment deleted")
        );
    }
}