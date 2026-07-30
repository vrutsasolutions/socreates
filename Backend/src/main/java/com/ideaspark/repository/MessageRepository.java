package com.ideaspark.repository;

import com.ideaspark.model.Conversation;
import com.ideaspark.model.Message;
import com.ideaspark.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Modifying;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    List<Message> findByConversationOrderByCreatedAtAsc(Conversation conversation);

    // ── Chat pagination ──────────────────────────────────────────────────
    // Opening a chat used to load the ENTIRE message history every time.
    // This fetches one page at a time (see MessageService.getMessages),
    // newest first — the service reverses it back to ascending for display.
    Page<Message> findByConversation(Conversation conversation, Pageable pageable);

    // All of a user's unread messages in a conversation, regardless of
    // which page is currently loaded — used so opening a chat still marks
    // the WHOLE thread read, not just the most recent page.
    List<Message> findByConversationAndIsReadFalseAndSenderIdNot(Conversation conversation, UUID senderId);

    // ── Inbox batching ───────────────────────────────────────────────────
    // Replaces one findTopByConversationOrderByCreatedAtDesc() call PER
    // conversation with a single query for all of them at once.
    @Query("SELECT m FROM Message m WHERE m.id IN (" +
            "  SELECT m2.id FROM Message m2 WHERE m2.conversation.id IN :conversationIds " +
            "  AND m2.createdAt = (SELECT MAX(m3.createdAt) FROM Message m3 WHERE m3.conversation = m2.conversation)" +
            ")")
    List<Message> findLastMessagesForConversations(@Param("conversationIds") List<UUID> conversationIds);

    // Replaces one countByConversationAndIsReadFalseAndSenderIdNot() call
    // PER conversation with a single grouped query for all of them.
    // Each row is [conversationId, count].
    @Query("SELECT m.conversation.id, COUNT(m) FROM Message m " +
            "WHERE m.conversation.id IN :conversationIds AND m.isRead = false AND m.sender.id <> :userId " +
            "GROUP BY m.conversation.id")
    List<Object[]> countUnreadForConversations(@Param("conversationIds") List<UUID> conversationIds,
            @Param("userId") UUID userId);

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