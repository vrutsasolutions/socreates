package com.ideaspark.repository;

import com.ideaspark.model.Conversation;
import com.ideaspark.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    // All messages in a conversation, oldest first
    List<Message> findByConversationOrderByCreatedAtAsc(Conversation conversation);

    // Count unread messages sent TO a specific conversation (not by the reader)
    long countByConversationAndIsReadFalse(Conversation conversation);
}
