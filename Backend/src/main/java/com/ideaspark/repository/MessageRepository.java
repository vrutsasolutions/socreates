package com.ideaspark.repository;

import com.ideaspark.model.Conversation;
import com.ideaspark.model.Message;
import com.ideaspark.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Modifying;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    List<Message> findByConversationOrderByCreatedAtAsc(Conversation conversation);

    List<Message> findByConversationAndTypeInOrderByCreatedAtDesc(
            Conversation conversation, List<Message.MessageType> types);

    long countByConversationAndIsReadFalse(Conversation conversation);

    List<Message> findByConversationId(UUID conversationId);

    @Modifying
    void deleteByConversationId(UUID conversationId);

    long countByConversationAndSenderAndType(Conversation conversation, User sender, Message.MessageType type);

    long countByConversationAndSenderAndTypeIn(Conversation conversation, User sender,
            List<Message.MessageType> types);

    // ✅ Get only the last message in a conversation
    Optional<Message> findTopByConversationOrderByCreatedAtDesc(Conversation conversation);

    // ✅ Count unread messages not sent by a specific user
    long countByConversationAndIsReadFalseAndSenderIdNot(Conversation conversation, UUID senderId);
}
