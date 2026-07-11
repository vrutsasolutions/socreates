package com.ideaspark.repository;

import com.ideaspark.model.Idea;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface IdeaRepository extends JpaRepository<Idea, UUID> {

    // All ideas newest first
    List<Idea> findAllByOrderByCreatedAtDesc();

    // By premium flag
    List<Idea> findByIsPremiumOrderByCreatedAtDesc(boolean isPremium);

    // By creator
    List<Idea> findByCreatorIdOrderByCreatedAtDesc(UUID creatorId);

    // By category
    List<Idea> findByCategoryOrderByCreatedAtDesc(String category);

    // Trending = most liked
    List<Idea> findAllByOrderByLikeCountDesc();

    // "Ideas of the Day" — ranked by combined engagement (views/reads + likes),
    // most recent as tiebreaker. Naturally reshuffles day to day as engagement
    // changes; caller limits results via Pageable (e.g. top 2).
    @Query("SELECT i FROM Idea i ORDER BY (i.readCount + i.likeCount) DESC, i.createdAt DESC")
    List<Idea> findTopByEngagement(Pageable pageable);

    // Search by title, description, category, or creator name
    // (matches the search bar's "ideas, categories, creators..." placeholder)
    @Query("SELECT i FROM Idea i WHERE " +
           "LOWER(i.title) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(i.description) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(i.category) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(i.creator.name) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "ORDER BY i.createdAt DESC")
    List<Idea> searchIdeas(@Param("q") String q);

    // Search with category filter
    @Query("SELECT i FROM Idea i WHERE " +
           "(LOWER(i.title) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(i.description) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(i.creator.name) LIKE LOWER(CONCAT('%', :q, '%'))) " +
           "AND i.category = :category ORDER BY i.createdAt DESC")
    List<Idea> searchIdeasWithCategory(@Param("q") String q, @Param("category") String category);

    // For plagiarism check — get all descriptions
    @Query("SELECT i.description FROM Idea i")
    List<String> findAllDescriptions();

    // Increment like count
    @Modifying
    @Query("UPDATE Idea i SET i.likeCount = i.likeCount + 1 WHERE i.id = :id")
    void incrementLikeCount(@Param("id") UUID id);

    @Modifying
    @Query("UPDATE Idea i SET i.likeCount = i.likeCount - 1 WHERE i.id = :id AND i.likeCount > 0")
    void decrementLikeCount(@Param("id") UUID id);

    // ✅ Added — Count ideas by creator
    int countByCreatorId(UUID creatorId);

    // ✅ Added — Sum all likes across all ideas by a creator
    @Query("SELECT COALESCE(SUM(i.likeCount), 0) FROM Idea i WHERE i.creator.id = :creatorId")
    int sumLikeCountByCreatorId(@Param("creatorId") UUID creatorId);

    // ── Creator dashboard aggregates ─────────────────────────────────────────

    // Total reads (sum of readCount) across all ideas by a creator
    @Query("SELECT COALESCE(SUM(i.readCount), 0) FROM Idea i WHERE i.creator.id = :creatorId")
    int sumReadCountByCreatorId(@Param("creatorId") UUID creatorId);

    // Count of premium ideas by creator
    int countByCreatorIdAndIsPremium(UUID creatorId, boolean isPremium);

    // Sum of reads on premium-only ideas by creator
    @Query("SELECT COALESCE(SUM(i.readCount), 0) FROM Idea i WHERE i.creator.id = :creatorId AND i.isPremium = true")
    int sumPremiumReadCountByCreatorId(@Param("creatorId") UUID creatorId);

    // Increment read count (called when idea detail is opened)
    @Modifying
    @Query("UPDATE Idea i SET i.readCount = i.readCount + 1 WHERE i.id = :id")
    void incrementReadCount(@Param("id") UUID id);

    // Dashboard content table: ideas with per-idea stats
    @Query("SELECT i FROM Idea i WHERE i.creator.id = :creatorId ORDER BY i.readCount DESC")
    List<Idea> findByCreatorIdOrderByReadCountDesc(@Param("creatorId") UUID creatorId);
}
