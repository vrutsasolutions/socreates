package com.ideaspark.repository;

import com.ideaspark.model.Conversation;
import com.ideaspark.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    List<Message> findByConversationOrderByCreatedAtAsc(Conversation conversation);

    long countByConversationAndIsReadFalse(Conversation conversation);

    // ✅ Added for delete account
    List<Message> findByConversationId(UUID conversationId);
}