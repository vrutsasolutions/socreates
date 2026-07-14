package com.ideaspark.service;

import com.ideaspark.dto.*;
import com.ideaspark.model.*;
import com.ideaspark.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
    private final FollowRepository followRepository;
    private final EmailService emailService;
    private final IdeaReadRepository ideaReadRepository;
    private final MembershipRepository membershipRepository;

    // ── Free-plan read cap ────────────────────────────────────────────────
    // A signed-in user who is neither reader-premium nor creator-pro can read
    // this many DISTINCT ideas in total (lifetime, not monthly) before every
    // further idea's detail page shows only image/title with the description
    // blurred out, prompting a membership upgrade. Reading an idea already in
    // their "read" set again never re-locks it or consumes another slot.
    private static final int FREE_READ_LIMIT = 10;

    // ── Like milestones: fire at each of these counts ────────────────────────
    private static final Set<Integer> LIKE_MILESTONES = Set.of(25, 100, 500, 1000, 5000, 10000);

    private boolean isLikeMilestone(int count) {
        if (LIKE_MILESTONES.contains(count))
            return true; // early milestones
        if (count > 10000 && count % 10000 == 0)
            return true; // every 10k after that
        return false;
    }

    // Builds a short, safe teaser from the real (possibly paywalled)
    // description — used instead of the full text whenever `description` is
    // being blanked out for a locked idea, so the client always has exactly
    // one legible line to show and never more. Cuts at the first sentence
    // if it's short enough, otherwise at the last whole word within ~140
    // chars (never mid-word), with an ellipsis to signal it's truncated.
    private String buildPreviewText(String fullDescription) {
        if (fullDescription == null || fullDescription.isBlank()) {
            return null;
        }
        String trimmed = fullDescription.strip();
        int maxLen = 140;

        int sentenceEnd = -1;
        for (String terminator : new String[]{". ", "! ", "? "}) {
            int idx = trimmed.indexOf(terminator);
            if (idx != -1 && idx <= maxLen && (sentenceEnd == -1 || idx < sentenceEnd)) {
                sentenceEnd = idx + 1; // include the punctuation, drop the trailing space
            }
        }
        if (sentenceEnd != -1) {
            return trimmed.substring(0, sentenceEnd);
        }
        if (trimmed.length() <= maxLen) {
            return trimmed;
        }
        int cut = trimmed.lastIndexOf(' ', maxLen);
        if (cut <= 0) cut = maxLen;
        return trimmed.substring(0, cut).stripTrailing() + "…";
    }

    // Applies the premium-content gate uniformly across every DTO-building
    // path — list feeds, search, the premium grid, and idea detail — so a
    // non-subscriber's network response never carries the real description
    // for a locked idea anywhere it can be rendered, only the short
    // previewText teaser. Centralized here instead of only in getById() so
    // Home/Search/Premium card feeds get the same server-side protection.
    private void applyPremiumLockIfNeeded(IdeaDTO dto, Idea idea, User viewer, boolean isOwner) {
        if (!idea.isPremium() || isOwner) return;
        boolean readerPremium = viewer != null && viewer.isPremium();
        if (readerPremium) return;
        dto.setPreviewText(buildPreviewText(idea.getDescription()));
        dto.setDescription(null);
        dto.setLocked(true);
        dto.setLockReason("premium");
    }

    public List<IdeaDTO> getAllIdeas(String sort, String currentUserEmail) {
        List<Idea> ideas = switch (sort != null ? sort : "latest") {
            case "trending" -> ideaRepository.findAllByOrderByLikeCountDesc();
            case "recommended" -> ideaRepository.findAllByOrderByCreatedAtDesc();
            default -> ideaRepository.findAllByOrderByCreatedAtDesc();
        };

        User currentUser = currentUserEmail != null
                ? userRepository.findByEmail(currentUserEmail).orElse(null)
                : null;

        Set<UUID> savedIdeaIds = currentUser != null
                ? savedIdeaRepository.findByUserIdOrderBySavedAtDesc(currentUser.getId())
                        .stream().map(s -> s.getIdea().getId()).collect(java.util.stream.Collectors.toSet())
                : Set.of();

        Set<UUID> likedIdeaIds = currentUser != null
                ? ideaLikeRepository.findAll().stream()
                        .filter(l -> l.getUser() != null && l.getUser().getId().equals(currentUser.getId()))
                        .map(l -> l.getIdea().getId())
                        .collect(java.util.stream.Collectors.toSet())
                : Set.of();

        return ideas.stream()
                .map(i -> toDTOFast(i, currentUser, savedIdeaIds, likedIdeaIds))
                .toList();
    }

    public List<IdeaDTO> getPremiumIdeas(String currentUserEmail) {
        return ideaRepository.findByIsPremiumOrderByCreatedAtDesc(true)
                .stream()
                .map(i -> toDTO(i, currentUserEmail))
                .toList();
    }

    @Transactional
    public IdeaDTO getById(UUID id, String currentUserEmail) {
        Idea idea = ideaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Idea not found"));

        IdeaDTO dto = toDTO(idea, currentUserEmail);

        User currentUser = currentUserEmail != null
                ? userRepository.findByEmail(currentUserEmail).orElse(null)
                : null;

        boolean isOwner = currentUser != null && idea.getCreator() != null
                && idea.getCreator().getId().equals(currentUser.getId());

        // ── Premium-content gate ────────────────────────────────────────
        // toDTO() above already applied this gate centrally (so Home/Search/
        // Premium-grid feeds get the same server-side stripping) — nothing
        // further to do here for that case, just stop before the free-read
        // logic below runs on top of an already-locked idea.
        if (dto.isLocked()) {
            return dto;
        }

        // ── Free-plan read cap ──────────────────────────────────────────
        // Guests (currentUser == null) and the idea's own creator are never
        // gated. Reader-premium and creator-pro users are exempt — unlimited
        // reads either way.
        if (currentUser != null && !isOwner) {
            boolean exempt = currentUser.isPremium()
                    || membershipRepository.hasActiveCreatorPro(currentUser.getId(), LocalDateTime.now());

            if (!exempt) {
                boolean alreadyRead = ideaReadRepository.existsByUserIdAndIdeaId(currentUser.getId(), id);
                long readCount = ideaReadRepository.countByUserId(currentUser.getId());

                if (alreadyRead) {
                    // Already spent a slot on this idea earlier — always
                    // re-readable in full, doesn't consume anything further.
                    dto.setFreeReadsUsed((int) readCount);
                    dto.setFreeReadsLimit(FREE_READ_LIMIT);
                } else if (readCount >= FREE_READ_LIMIT) {
                    // Cap reached and this is a NEW idea — lock it.
                    dto.setPreviewText(buildPreviewText(idea.getDescription()));
                    dto.setDescription(null);
                    dto.setLocked(true);
                    dto.setLockReason("read_limit");
                    dto.setFreeReadsUsed((int) readCount);
                    dto.setFreeReadsLimit(FREE_READ_LIMIT);
                    return dto;
                } else {
                    // Grant this idea and spend one of the free slots.
                    ideaReadRepository.save(IdeaRead.builder()
                            .user(currentUser)
                            .idea(idea)
                            .build());
                    dto.setFreeReadsUsed((int) readCount + 1);
                    dto.setFreeReadsLimit(FREE_READ_LIMIT);
                }
            }
        }

        return dto;
    }

    @Transactional
    public IdeaDTO createIdea(
            CreateIdeaRequest req,
            String imageUrl,
            List<String> imageUrls,
            String creatorEmail) {

        User creator = userRepository.findByEmail(creatorEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // ── Premium ideas are Creator Pro only ──────────────────────────
        // The frontend already disables/forces this toggle off for non-
        // Creator-Pro users (see AddIdea.jsx), but that's UI-only — nothing
        // stopped a direct API call from setting isPremium:true regardless.
        // hasActiveCreatorPro() is the real source of truth (User.creatorPro
        // is never populated by any code path — see the note on that
        // repository method), so check it here, server-side, before trusting
        // req.isPremium() at all.
        if (req.isPremium()
                && !membershipRepository.hasActiveCreatorPro(creator.getId(), LocalDateTime.now())) {
            throw new RuntimeException("Only Creator Pro subscribers can publish premium ideas.");
        }

        // Plagiarism check only for Premium users
        if (creator.isPremium()) {
            System.out.println("Premium User Detected");

            PlagiarismResult result = plagiarismService.check(req.getDescription());

            System.out.println("Plagiarized: " + result.isPlagiarized());
            System.out.println("Message: " + result.getMessage());

            if (result.isPlagiarized()) {
                throw new RuntimeException(result.getMessage());
            }
        }

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

        try {
            List<Follow> followers = followRepository.findByFollowing(creator);

            for (Follow follow : followers) {
                User follower = follow.getFollower();

                emailService.sendNewIdeaNotificationEmail(

                        follower.getEmail(),
                        creator.getName(),
                        savedIdea.getTitle(),
                        savedIdea.getDescription(),
                        savedIdea.getCategory(),
                        savedIdea.getId());

                // In-app bell notification — gated by the follower's "New Idea
                // Alerts" toggle inside NotificationService.sendNotification.
                // Email above is unaffected by that toggle by design.
                try {
                    Notification notification = Notification.builder()
                            .message(
                                    (creator.getUsername() != null && !creator.getUsername().isBlank()
                                            ? creator.getUsername()
                                            : creator.getName()) + " posted a new idea: " + savedIdea.getTitle())
                            .readStatus(false)
                            .type(Notification.NotificationType.NEW_IDEA)
                            .referenceId(savedIdea.getId())
                            .createdAt(java.time.LocalDateTime.now())
                            .user(follower)
                            .build();

                    notificationService.sendNotification(notification);
                } catch (Exception e) {
                    System.out.println("New idea in-app notification failed: " + e.getMessage());
                }

            }
        } catch (Exception e) {
            System.out.println("New idea follower email failed: " + e.getMessage());
        }

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
                commentRepository.findByIdeaIdOrderByCreatedAtDesc(id));

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
                        .type(Notification.NotificationType.BOOKMARK)
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

    // "Ideas of the Day" for the Explore page — top idea(s) ranked by combined
    // views (readCount) + likes. No date-based randomization needed: as
    // engagement changes throughout the day, the ranking naturally shifts, so
    // a fresh page load can surface a different idea day to day.
    public List<IdeaDTO> getIdeasOfTheDay(int limit, String userEmail) {
        int safeLimit = Math.max(1, Math.min(limit, 10));
        List<Idea> ideas = ideaRepository.findTopByEngagement(
                org.springframework.data.domain.PageRequest.of(0, safeLimit));
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

    // Public ideas for any user's profile page (e.g. viewing a follower's profile).
    // currentUserEmail is the viewer (for savedByCurrentUser / likedByCurrentUser
    // flags),
    // not the profile owner.
    public List<IdeaDTO> getIdeasByUser(UUID profileUserId, String currentUserEmail) {
        userRepository.findById(profileUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ideaRepository.findByCreatorIdOrderByCreatedAtDesc(profileUserId)
                .stream()
                .map(i -> toDTO(i, currentUserEmail))
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
            int newLikeCount = currentCount + 1;
            idea.setLikeCount(newLikeCount);
            ideaRepository.save(idea);

            // ── Like milestone email ──────────────────────────────────────────
            if (isLikeMilestone(newLikeCount)) {
                try {
                    User creator = idea.getCreator();
                    if (creator != null && creator.getEmail() != null) {
                        emailService.sendLikeMilestoneEmail(
                                creator.getEmail(),
                                creator.getName() != null ? creator.getName() : "Creator",
                                idea.getTitle(),
                                newLikeCount);
                    }
                } catch (Exception e) {
                    System.out.println("Like milestone email failed: " + e.getMessage());
                }
            }

            try {
                if (idea.getCreator() != null &&
                        !liker.getId().equals(idea.getCreator().getId())) {

                    Notification notification = Notification.builder()
                            .message(
                                    (liker.getUsername() != null && !liker.getUsername().isBlank()
                                            ? liker.getUsername()
                                            : liker.getName()) + " liked your idea!")
                            .readStatus(false)
                            .type(Notification.NotificationType.LIKE)
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
                        .type(Notification.NotificationType.COMMENT)
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

    private IdeaDTO toDTOFast(Idea idea, User currentUser, Set<UUID> savedIdeaIds, Set<UUID> likedIdeaIds) {
        IdeaDTO dto = new IdeaDTO();
        dto.setId(idea.getId());
        dto.setTitle(idea.getTitle());
        dto.setDescription(idea.getDescription());
        dto.setImageUrl(idea.getImageUrl());
        dto.setImageUrls(idea.getImageUrls());
        dto.setCategory(idea.getCategory());
        dto.setPremium(idea.isPremium());
        dto.setLikeCount(idea.getLikeCount());
        dto.setReadCount(idea.getReadCount());
        dto.setCommentCount(commentRepository.countByIdeaId(idea.getId()));
        dto.setCreatedAt(idea.getCreatedAt());
        if (idea.getCreator() != null) {
            dto.setCreatorId(idea.getCreator().getId());
            dto.setCreatorName(idea.getCreator().getName());
            dto.setCreatorImage(idea.getCreator().getProfileImage());
        }
        if (currentUser != null) {
            dto.setSavedByCurrentUser(savedIdeaIds.contains(idea.getId()));
            dto.setLikedByCurrentUser(likedIdeaIds.contains(idea.getId()));
        }

        boolean isOwner = currentUser != null && idea.getCreator() != null
                && idea.getCreator().getId().equals(currentUser.getId());
        applyPremiumLockIfNeeded(dto, idea, currentUser, isOwner);

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
        dto.setReadCount(idea.getReadCount());
        dto.setCommentCount(commentRepository.countByIdeaId(idea.getId()));
        dto.setCreatedAt(idea.getCreatedAt());

        if (idea.getCreator() != null) {
            dto.setCreatorId(idea.getCreator().getId());
            dto.setCreatorName(idea.getCreator().getName());
            dto.setCreatorImage(idea.getCreator().getProfileImage());
        }

        User viewer = currentUserEmail != null
                ? userRepository.findByEmail(currentUserEmail).orElse(null)
                : null;

        if (viewer != null) {
            dto.setSavedByCurrentUser(
                    savedIdeaRepository.existsByUserIdAndIdeaId(viewer.getId(), idea.getId()));
            dto.setLikedByCurrentUser(
                    ideaLikeRepository.existsByUserAndIdea(viewer, idea));
        }

        boolean isOwner = viewer != null && idea.getCreator() != null
                && idea.getCreator().getId().equals(viewer.getId());
        applyPremiumLockIfNeeded(dto, idea, viewer, isOwner);

        return dto;
    }

}
