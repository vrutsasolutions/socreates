package com.ideaspark.repository;

import com.ideaspark.model.Conversation;
import com.ideaspark.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    @Query("SELECT c FROM Conversation c WHERE c.participant1 = :user OR c.participant2 = :user ORDER BY c.createdAt DESC")
    List<Conversation> findAllByUser(@Param("user") User user);

    @Query("SELECT c FROM Conversation c WHERE (c.participant1 = :a AND c.participant2 = :b) OR (c.participant1 = :b AND c.participant2 = :a)")
    Optional<Conversation> findBetween(@Param("a") User a, @Param("b") User b);

    // ✅ Added for delete account
    @Query("SELECT c FROM Conversation c WHERE c.participant1 = :user OR c.participant2 = :user")
    List<Conversation> findByUser(@Param("user") User user);
}