package com.ideaspark.service;

import com.ideaspark.dto.*;
import com.ideaspark.model.*;
import com.ideaspark.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class IdeaService {

    private final IdeaRepository ideaRepository;
    private final UserRepository userRepository;
    private final SavedIdeaRepository savedIdeaRepository;
    private final PlagiarismService plagiarismService;
    private final NotificationService notificationService;

    // ── Get all ideas ────────────────────────────────────────
    public List<IdeaDTO> getAllIdeas(String sort, String currentUserEmail) {
        List<Idea> ideas = switch (sort != null ? sort : "latest") {
            case "trending" ->
                ideaRepository.findAllByOrderByLikeCountDesc();
            case "recommended" ->
                ideaRepository.findAllByOrderByCreatedAtDesc();
            default ->
                ideaRepository.findAllByOrderByCreatedAtDesc();
        };
        return ideas.stream().map(i -> toDTO(i, currentUserEmail)).toList();
    }

    // ── Get premium ideas ────────────────────────────────────
    public List<IdeaDTO> getPremiumIdeas(String currentUserEmail) {
        return ideaRepository.findByIsPremiumOrderByCreatedAtDesc(true)
                .stream().map(i -> toDTO(i, currentUserEmail)).toList();
    }

    // ── Get single idea ──────────────────────────────────────
    public IdeaDTO getById(UUID id, String currentUserEmail) {
        Idea idea = ideaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Idea not found"));
        return toDTO(idea, currentUserEmail);
    }

    // ── Create idea ──────────────────────────────────────────
    @Transactional
    public IdeaDTO createIdea(CreateIdeaRequest req, String imageUrl, String creatorEmail) {
        // Run plagiarism check
        PlagiarismResult result = plagiarismService.check(req.getDescription());
        if (result.isPlagiarized()) {
            throw new RuntimeException(result.getMessage());
        }

        User creator = userRepository.findByEmail(creatorEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Idea idea = Idea.builder()
                .title(req.getTitle())
                .description(req.getDescription())
                .imageUrl(imageUrl)
                .creator(creator)
                .category(req.getCategory())
                .isPremium(req.isPremium())
                .build();

        Idea savedIdea = ideaRepository.save(idea);
        

        return toDTO(savedIdea, creatorEmail);
    }

    // ── Delete idea ──────────────────────────────────────────
    @Transactional
    public void deleteIdea(UUID id, String userEmail) {
        Idea idea = ideaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Idea not found"));
        if (!idea.getCreator().getEmail().equals(userEmail)) {
            throw new RuntimeException("Not authorized to delete this idea");
        }
        ideaRepository.delete(idea);
    }

    // ── Save / Bookmark idea ─────────────────────────────────
    @Transactional
    public void saveIdea(UUID ideaId, String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        Idea idea = ideaRepository.findById(ideaId).orElseThrow();
        if (!savedIdeaRepository.existsByUserIdAndIdeaId(user.getId(), ideaId)) {

            savedIdeaRepository.save(SavedIdea.builder().user(user).idea(idea).build());

            Notification notification = Notification.builder()
                    .message(user.getName() + "bookmarked your idea!")
                    .readStatus(false)
                    .createdAt(java.time.LocalDateTime.now())
                    .user(idea.getCreator())
                    .build();

                    if (!user.getId().equals(idea.getCreator().getId())) {
    notificationService.sendNotification(notification);
}
            
        }
    }

    // ── Unsave idea ──────────────────────────────────────────
    @Transactional
    public void unsaveIdea(UUID ideaId, String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        savedIdeaRepository.deleteByUserIdAndIdeaId(user.getId(), ideaId);
    }

    // ── Get saved ideas ──────────────────────────────────────
    public List<IdeaDTO> getSavedIdeas(String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        return savedIdeaRepository.findByUserIdOrderBySavedAtDesc(user.getId())
                .stream().map(s -> toDTO(s.getIdea(), userEmail)).toList();
    }

    // ── Search ideas ─────────────────────────────────────────
    public List<IdeaDTO> search(String q, String category, String userEmail) {
        List<Idea> ideas;
        if (q != null && !q.isBlank() && category != null && !category.isBlank()) {
            ideas = ideaRepository.searchIdeasWithCategory(q, category);
        } else if (q != null && !q.isBlank()) {
            ideas = ideaRepository.searchIdeas(q);
        } else if (category != null && !category.isBlank()) {
            ideas = ideaRepository.findByCategoryOrderByCreatedAtDesc(category);
        } else {
            ideas = ideaRepository.findAllByOrderByCreatedAtDesc();
        }
        return ideas.stream().map(i -> toDTO(i, userEmail)).toList();
    }

    // ── My ideas ─────────────────────────────────────────────
    public List<IdeaDTO> getMyIdeas(String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        return ideaRepository.findByCreatorIdOrderByCreatedAtDesc(user.getId())
                .stream().map(i -> toDTO(i, userEmail)).toList();
    }

    // ── Like / Unlike ────────────────────────────────────────
    @Transactional
    public void likeIdea(UUID ideaId, String userEmail) {

        User liker = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Idea idea = ideaRepository.findById(ideaId)
                .orElseThrow(() -> new RuntimeException("Idea not found"));

        Notification notification = Notification.builder()
                .message(
                        (liker.getUsername() != null && !liker.getUsername().isBlank()
                        ? liker.getUsername()
                        : liker.getName()) + " liked your idea!"
                )
                .readStatus(false)
                .createdAt(java.time.LocalDateTime.now())
                .user(idea.getCreator())
                .build();

        if (!liker.getId().equals(idea.getCreator().getId())) {
    notificationService.sendNotification(notification);
}
        ideaRepository.incrementLikeCount(ideaId);
    }

    @Transactional
    public void unlikeIdea(UUID ideaId) {
        ideaRepository.decrementLikeCount(ideaId);
    }

    // ── DTO mapper ───────────────────────────────────────────
    private IdeaDTO toDTO(Idea idea, String currentUserEmail) {
        IdeaDTO dto = new IdeaDTO();
        dto.setId(idea.getId());
        dto.setTitle(idea.getTitle());
        dto.setDescription(idea.getDescription());
        dto.setImageUrl(idea.getImageUrl());
        dto.setCategory(idea.getCategory());
        dto.setPremium(idea.isPremium());
        dto.setLikeCount(idea.getLikeCount());
        dto.setCreatedAt(idea.getCreatedAt());

        if (idea.getCreator() != null) {
            dto.setCreatorId(idea.getCreator().getId());
            dto.setCreatorName(idea.getCreator().getName());
            dto.setCreatorImage(idea.getCreator().getProfileImage());
        }

        if (currentUserEmail != null) {
            userRepository.findByEmail(currentUserEmail).ifPresent(user
                    -> dto.setSavedByCurrentUser(
                            savedIdeaRepository.existsByUserIdAndIdeaId(user.getId(), idea.getId())
                    )
            );
        }
        return dto;
    }
}
