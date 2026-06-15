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
    private final IdeaLikeRepository ideaLikeRepository;
    private final CommentRepository commentRepository;
    private final CloudflareImageService cloudflareImageService;

    public List<IdeaDTO> getAllIdeas(String sort, String currentUserEmail) {
        List<Idea> ideas = switch (sort != null ? sort : "latest") {
            case "trending" -> ideaRepository.findAllByOrderByLikeCountDesc();
            case "recommended" -> ideaRepository.findAllByOrderByCreatedAtDesc();
            default -> ideaRepository.findAllByOrderByCreatedAtDesc();
        };

        return ideas.stream().map(i -> toDTO(i, currentUserEmail)).toList();
    }

    public List<IdeaDTO> getPremiumIdeas(String currentUserEmail) {
        return ideaRepository.findByIsPremiumOrderByCreatedAtDesc(true)
                .stream()
                .map(i -> toDTO(i, currentUserEmail))
                .toList();
    }

    public IdeaDTO getById(UUID id, String currentUserEmail) {
        Idea idea = ideaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Idea not found"));

        return toDTO(idea, currentUserEmail);
    }

    @Transactional
    public IdeaDTO createIdea(
            CreateIdeaRequest req,
            String imageUrl,
            List<String> imageUrls,
            String creatorEmail) {

        User creator = userRepository.findByEmail(creatorEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Idea idea = Idea.builder()
                .title(req.getTitle())
                .description(req.getDescription())
                .imageUrl(imageUrl)
                .imageUrls(imageUrls != null ? imageUrls : new ArrayList<>())
                .creator(creator)
                .category(req.getCategory())
                .isPremium(req.isPremium())
                .likeCount(0)
                .build();

        Idea savedIdea = ideaRepository.save(idea);

        return toDTO(savedIdea, creatorEmail);
    }

    @Transactional
public void deleteIdea(UUID id, String userEmail) {

    Idea idea = ideaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Idea not found"));

    if (!idea.getCreator().getEmail().equals(userEmail)) {
        throw new RuntimeException("Not authorized to delete this idea");
    }

    // Delete images from Cloudflare
    if (idea.getImageUrls() != null && !idea.getImageUrls().isEmpty()) {
        for (String url : idea.getImageUrls()) {
            cloudflareImageService.deleteImage(url);
        }
    } else if (idea.getImageUrl() != null && !idea.getImageUrl().isBlank()) {
        cloudflareImageService.deleteImage(idea.getImageUrl());
    }

    // Delete bookmarks
    savedIdeaRepository.deleteByIdeaId(id);

    // Delete likes
    ideaLikeRepository.deleteByIdeaId(id);

    // Delete comments
    commentRepository.deleteAll(
            commentRepository.findByIdeaIdOrderByCreatedAtDesc(id)
    );

    // Delete idea
    ideaRepository.delete(idea);
}
    @Transactional
    public void saveIdea(UUID ideaId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Idea idea = ideaRepository.findById(ideaId)
                .orElseThrow(() -> new RuntimeException("Idea not found"));

        if (!savedIdeaRepository.existsByUserIdAndIdeaId(user.getId(), ideaId)) {

            savedIdeaRepository.save(
                    SavedIdea.builder()
                            .user(user)
                            .idea(idea)
                            .build());

            if (!user.getId().equals(idea.getCreator().getId())) {
                Notification notification = Notification.builder()
                        .message(user.getName() + " bookmarked your idea!")
                        .readStatus(false)
                        .referenceId(idea.getId())
                        .createdAt(java.time.LocalDateTime.now())
                        .user(idea.getCreator())
                        .build();

                notificationService.sendNotification(notification);
            }
        }
    }

    @Transactional
    public void unsaveIdea(UUID ideaId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        savedIdeaRepository.deleteByUserIdAndIdeaId(user.getId(), ideaId);
    }

    public List<IdeaDTO> getSavedIdeas(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return savedIdeaRepository.findByUserIdOrderBySavedAtDesc(user.getId())
                .stream()
                .map(s -> toDTO(s.getIdea(), userEmail))
                .toList();
    }

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

    public List<IdeaDTO> getMyIdeas(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ideaRepository.findByCreatorIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(i -> toDTO(i, userEmail))
                .toList();
    }

    @Transactional
    public void likeIdea(UUID ideaId, String userEmail) {

        User liker = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Idea idea = ideaRepository.findById(ideaId)
                .orElseThrow(() -> new RuntimeException("Idea not found"));

        if (!ideaLikeRepository.existsByUserAndIdea(liker, idea)) {

            ideaLikeRepository.save(
                    IdeaLike.builder()
                            .user(liker)
                            .idea(idea)
                            .build());

            int currentCount = idea.getLikeCount();
            idea.setLikeCount(currentCount + 1);
            ideaRepository.save(idea);

            try {
                if (idea.getCreator() != null &&
                        !liker.getId().equals(idea.getCreator().getId())) {

                    Notification notification = Notification.builder()
                            .message(
                                    (liker.getUsername() != null && !liker.getUsername().isBlank()
                                            ? liker.getUsername()
                                            : liker.getName()) + " liked your idea!")
                            .readStatus(false)
                            .referenceId(idea.getId())
                            .createdAt(java.time.LocalDateTime.now())
                            .user(idea.getCreator())
                            .build();

                    notificationService.sendNotification(notification);
                }
            } catch (Exception e) {
                System.out.println("Notification failed: " + e.getMessage());
            }
        }
    }

    @Transactional
    public void unlikeIdea(UUID ideaId, String userEmail) {

        User liker = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Idea idea = ideaRepository.findById(ideaId)
                .orElseThrow(() -> new RuntimeException("Idea not found"));

        ideaLikeRepository.findByUserAndIdea(liker, idea).ifPresent(like -> {
            ideaLikeRepository.delete(like);

            int currentCount = idea.getLikeCount();
            idea.setLikeCount(Math.max(0, currentCount - 1));

            ideaRepository.save(idea);
        });
    }

    @Transactional
    public CommentDTO addComment(UUID ideaId, CreateCommentRequest req, String userEmail) {

        if (req.getContent() == null || req.getContent().trim().isEmpty()) {
            throw new RuntimeException("Comment cannot be empty");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Idea idea = ideaRepository.findById(ideaId)
                .orElseThrow(() -> new RuntimeException("Idea not found"));

        Comment comment = Comment.builder()
                .content(req.getContent().trim())
                .user(user)
                .idea(idea)
                .build();

        Comment savedComment = commentRepository.save(comment);

        try {
            if (idea.getCreator() != null &&
                    !user.getId().equals(idea.getCreator().getId())) {

                Notification notification = Notification.builder()
                        .message(
                                (user.getUsername() != null && !user.getUsername().isBlank()
                                        ? user.getUsername()
                                        : user.getName()) + " commented on your idea!")
                        .readStatus(false)
                        .referenceId(idea.getId())
                        .createdAt(java.time.LocalDateTime.now())
                        .user(idea.getCreator())
                        .build();

                notificationService.sendNotification(notification);
            }
        } catch (Exception e) {
            System.out.println("Comment notification failed: " + e.getMessage());
        }

        return toCommentDTO(savedComment);
    }

    public List<CommentDTO> getComments(UUID ideaId) {
        return commentRepository.findByIdeaIdOrderByCreatedAtDesc(ideaId)
                .stream()
                .map(this::toCommentDTO)
                .toList();
    }

    @Transactional
    public void deleteComment(UUID commentId, String userEmail) {

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (comment.getUser() == null ||
                !comment.getUser().getEmail().equals(userEmail)) {
            throw new RuntimeException("Not authorized to delete this comment");
        }

        commentRepository.delete(comment);
    }

    private CommentDTO toCommentDTO(Comment comment) {
        CommentDTO dto = new CommentDTO();

        dto.setId(comment.getId());
        dto.setContent(comment.getContent());
        dto.setCreatedAt(comment.getCreatedAt());

        if (comment.getUser() != null) {
            dto.setUserId(comment.getUser().getId());
            dto.setUserName(comment.getUser().getName());
            dto.setUserImage(comment.getUser().getProfileImage());
        }

        return dto;
    }

    private IdeaDTO toDTO(Idea idea, String currentUserEmail) {
        IdeaDTO dto = new IdeaDTO();

        dto.setId(idea.getId());
        dto.setTitle(idea.getTitle());
        dto.setDescription(idea.getDescription());
        dto.setImageUrl(idea.getImageUrl());
        dto.setImageUrls(idea.getImageUrls());
        dto.setCategory(idea.getCategory());
        dto.setPremium(idea.isPremium());
        dto.setLikeCount(idea.getLikeCount());
        dto.setCommentCount(commentRepository.countByIdeaId(idea.getId()));
        dto.setCreatedAt(idea.getCreatedAt());

        if (idea.getCreator() != null) {
            dto.setCreatorId(idea.getCreator().getId());
            dto.setCreatorName(idea.getCreator().getName());
            dto.setCreatorImage(idea.getCreator().getProfileImage());
        }

        if (currentUserEmail != null) {
            userRepository.findByEmail(currentUserEmail).ifPresent(user -> {
                dto.setSavedByCurrentUser(
                        savedIdeaRepository.existsByUserIdAndIdeaId(user.getId(), idea.getId()));

                dto.setLikedByCurrentUser(
                        ideaLikeRepository.existsByUserAndIdea(user, idea));
            });
        }

        return dto;
    }
}
