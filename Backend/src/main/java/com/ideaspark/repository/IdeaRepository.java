package com.ideaspark.repository;

import com.ideaspark.model.Idea;
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

    // Search by title or description
    @Query("SELECT i FROM Idea i WHERE " +
           "LOWER(i.title) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(i.description) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "ORDER BY i.createdAt DESC")
    List<Idea> searchIdeas(@Param("q") String q);

    // Search with category filter
    @Query("SELECT i FROM Idea i WHERE " +
           "(LOWER(i.title) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(i.description) LIKE LOWER(CONCAT('%', :q, '%'))) " +
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
}