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

    // ── Free-plan PREMIUM read cap ──────────────────────────────────────────
    // Normal (non-premium) ideas have NO read limit at all for a signed-in
    // free user — unlimited, always full access, nothing tracked.
    //
    // Only PREMIUM ideas are capped: a signed-in user who is neither
    // reader-premium nor creator-pro can fully open this many DISTINCT
    // premium ideas (lifetime, not monthly) — one full read each — before
    // every further NEW premium idea's detail page shows only image/title
    // with the description blurred out, prompting a membership upgrade.
    //
    // Unlike a typical usage cap, reopening a premium idea already spent
    // from this quota does NOT stay unlocked — it locks again (blurred),
    // same as hitting the limit. See IdeaRead's class doc for details.
    private static final int PREMIUM_FREE_READ_LIMIT = 5;

    // ── Idea description length bounds ──────────────────────────────────────
    // Applied server-side in createIdea() so a direct API call can't bypass
    // AddIdea.jsx's own limits. A floor stops throwaway one-line "descriptions"
    // (the kind that make a premium card's blur look thin no matter how it's
    // rendered) without banning genuinely short pitches outright; the ceiling
    // just mirrors the frontend's textarea cap so the two never disagree.
    private static final int DESC_MIN_LENGTH = 100;
    private static final int DESC_MAX_LENGTH = 5000;

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
    //
    // IMPORTANT: this mirrors getById()'s per-idea read-cap rules (below)
    // but is READ-ONLY — it never writes an IdeaRead row. A card showing up
    // in a feed/grid must reflect what would happen if the viewer actually
    // opened it (so unread premium ideas still under the cap show their
    // real, unblurred description on the card), but only actually opening
    // the idea via getById() spends a slot. That keeps Home/Premium/Search
    // cards unblurred right up until THIS specific idea's slot is spent or
    // the lifetime cap is hit — matching the "blur only once used" spec.
    private void applyPremiumLockIfNeeded(IdeaDTO dto, Idea idea, User viewer, boolean isOwner) {
        if (!idea.isPremium() || isOwner) return;

        if (viewer == null) {
            // Guests always see the locked/blurred preview — premium
            // requires being signed in at all, before any per-user quota
            // even applies.
            dto.setPreviewText(buildPreviewText(idea.getDescription()));
            dto.setDescription(null);
            dto.setLocked(true);
            dto.setLockReason("premium");
            return;
        }

        boolean exempt = viewer.isPremium()
                || membershipRepository.hasActiveCreatorPro(viewer.getId(), LocalDateTime.now());
        if (exempt) return; // dto.description already holds the real text

        boolean alreadyRead = ideaReadRepository.existsByUserIdAndIdeaId(viewer.getId(), idea.getId());
        if (alreadyRead) {
            // This exact premium idea's one-time slot was already spent —
            // lock/blur the card, same as the detail page would.
            dto.setPreviewText(buildPreviewText(idea.getDescription()));
            dto.setDescription(null);
            dto.setLocked(true);
            dto.setLockReason("already_read");
            dto.setFreeReadsLimit(PREMIUM_FREE_READ_LIMIT);
            return;
        }

        long premiumReadCount = ideaReadRepository.countPremiumReadsByUserId(viewer.getId());
        if (premiumReadCount >= PREMIUM_FREE_READ_LIMIT) {
            // All slots spent on OTHER premium ideas, and this one's new —
            // lock/blur the card.
            dto.setPreviewText(buildPreviewText(idea.getDescription()));
            dto.setDescription(null);
            dto.setLocked(true);
            dto.setLockReason("read_limit");
            dto.setFreeReadsUsed((int) premiumReadCount);
            dto.setFreeReadsLimit(PREMIUM_FREE_READ_LIMIT);
            return;
        }

        // Never opened yet, and slots remain — keep the card unlocked with
        // the real description. dto.description is already the idea's real
        // text (set by the caller before this method runs); nothing to
        // blank out. No IdeaRead row is written here — that only happens
        // when the viewer actually opens the idea via getById().
        dto.setLocked(false);
        dto.setLockReason(null);
        dto.setFreeReadsUsed((int) premiumReadCount);
        dto.setFreeReadsLimit(PREMIUM_FREE_READ_LIMIT);
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

        // Owners always get their own full idea back — nothing further to
        // gate. (Guests browsing a NORMAL idea also fall out below unlocked;
        // guests on a PREMIUM idea stay locked with lockReason "premium",
        // exactly as toDTO()'s uniform applyPremiumLockIfNeeded() left it.)
        if (isOwner) {
            return dto;
        }

        // Non-premium ideas: unlimited for everyone, signed in or not.
        // toDTO() never locks these (applyPremiumLockIfNeeded no-ops for
        // !idea.isPremium()), so dto.description is already the real text —
        // nothing to do.
        if (!idea.isPremium()) {
            return dto;
        }

        // From here on: idea IS premium. Guests stay locked (lockReason
        // "premium", set above by toDTO()) — subscribing/logging in is
        // required before any premium quota even applies.
        if (currentUser == null) {
            return dto;
        }

        // Reader-premium and creator-pro users read every premium idea in
        // full, unlimited — but toDTO()'s categorical gate above only checks
        // viewer.isPremium(), so a creator-pro viewer may have been locked
        // there incorrectly. Explicitly unlock for both exemptions here.
        boolean exempt = currentUser.isPremium()
                || membershipRepository.hasActiveCreatorPro(currentUser.getId(), LocalDateTime.now());
        if (exempt) {
            dto.setLocked(false);
            dto.setLockReason(null);
            dto.setDescription(idea.getDescription());
            dto.setPreviewText(null);
            return dto;
        }

        // ── Free-plan PREMIUM read cap ───────────────────────────────────
        // A free reader gets PREMIUM_FREE_READ_LIMIT full reads total, one
        // per distinct premium idea — and each is a ONE-TIME look: reopening
        // the very same premium idea again never grants full access a
        // second time, even though a slot was already spent on it and even
        // if slots remain unused. It shows the blurred/locked version again,
        // just like hitting the overall limit.
        boolean alreadyRead = ideaReadRepository.existsByUserIdAndIdeaId(currentUser.getId(), id);
        long premiumReadCount = ideaReadRepository.countPremiumReadsByUserId(currentUser.getId());

        if (alreadyRead) {
            // This exact premium idea's one-time slot is already spent —
            // lock it again on this and every future visit.
            dto.setPreviewText(buildPreviewText(idea.getDescription()));
            dto.setDescription(null);
            dto.setLocked(true);
            dto.setLockReason("already_read");
            dto.setFreeReadsUsed((int) premiumReadCount);
            dto.setFreeReadsLimit(PREMIUM_FREE_READ_LIMIT);
            return dto;
        }

        if (premiumReadCount >= PREMIUM_FREE_READ_LIMIT) {
            // All slots spent on OTHER premium ideas, and this one's new — lock it.
            dto.setPreviewText(buildPreviewText(idea.getDescription()));
            dto.setDescription(null);
            dto.setLocked(true);
            dto.setLockReason("read_limit");
            dto.setFreeReadsUsed((int) premiumReadCount);
            dto.setFreeReadsLimit(PREMIUM_FREE_READ_LIMIT);
            return dto;
        }

        // Grant this premium idea's one-time full read and spend one slot.
        ideaReadRepository.save(IdeaRead.builder()
                .user(currentUser)
                .idea(idea)
                .build());
        dto.setLocked(false);
        dto.setLockReason(null);
        dto.setDescription(idea.getDescription());
        dto.setPreviewText(null);
        dto.setFreeReadsUsed((int) premiumReadCount + 1);
        dto.setFreeReadsLimit(PREMIUM_FREE_READ_LIMIT);
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

        // ── Description length bounds ────────────────────────────────────
        // Server-side enforcement of AddIdea.jsx's own limits — the frontend
        // already blocks this in the UI, but that's client-side only, so a
        // direct API call could otherwise still save a one-line "desc3"-style
        // idea or an unbounded wall of text.
        int descLen = req.getDescription() == null ? 0 : req.getDescription().trim().length();
        if (descLen < DESC_MIN_LENGTH) {
            throw new RuntimeException(
                    "Description must be at least " + DESC_MIN_LENGTH + " characters (currently " + descLen + ").");
        }
        if (descLen > DESC_MAX_LENGTH) {
            throw new RuntimeException(
                    "Description must be under " + DESC_MAX_LENGTH + " characters (currently " + descLen + ").");
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
