package com.ideaspark.service;

import com.ideaspark.dto.ConversationDTO;
import com.ideaspark.dto.MessageDTO;
import com.ideaspark.dto.UserDTO;
import com.ideaspark.model.Conversation;
import com.ideaspark.model.Message;
import com.ideaspark.model.Message.MessageType;
import com.ideaspark.model.Notification;
import com.ideaspark.model.User;
import com.ideaspark.repository.ConversationRepository;
import com.ideaspark.repository.MessageRepository;
import com.ideaspark.repository.NotificationRepository;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MessageService {

        private final ConversationRepository conversationRepository;
        private final MessageRepository messageRepository;
        private final UserRepository userRepository;
        private final NotificationRepository notificationRepository;
        private final SimpMessagingTemplate messagingTemplate;

        // ── Get current user ────────────────────────────────────────────────────
        private User getUser(String email) {
                return userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        }

        // ── List all conversations for logged-in user ───────────────────────────
        public List<ConversationDTO> listConversations(String email) {
                User me = getUser(email);
                return conversationRepository.findAllByUser(me).stream()
                                .map(c -> toConversationDTO(c, me))
                                // Only show conversations that have at least one message,
                                // sorted by most recent message first (latest chat on top).
                                .filter(dto -> dto.getLastMessageAt() != null)
                                .sorted((a, b) -> b.getLastMessageAt().compareTo(a.getLastMessageAt()))
                                .toList();
        }

        // ── Get single conversation (verify user is a participant) ──────────────
        public ConversationDTO getConversation(UUID conversationId, String email) {
                User me = getUser(email);
                Conversation c = conversationRepository.findById(conversationId)
                                .orElseThrow(() -> new RuntimeException("Conversation not found"));
                assertParticipant(c, me);
                return toConversationDTO(c, me);
        }

        // ── Start or get existing conversation with another user ────────────────
        public ConversationDTO startConversation(UUID otherUserId, String email) {
                User me = getUser(email);
                User other = userRepository.findById(otherUserId)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                // Return existing if already exists
                Conversation conv = conversationRepository.findBetween(me, other)
                                .orElseGet(() -> conversationRepository.save(
                                                Conversation.builder()
                                                                .participant1(me)
                                                                .participant2(other)
                                                                .build()));
                return toConversationDTO(conv, me);
        }

        // ── Fetch all messages in a conversation ────────────────────────────────
        public List<MessageDTO> getMessages(UUID conversationId, String email) {
                User me = getUser(email);
                Conversation conv = conversationRepository.findById(conversationId)
                                .orElseThrow(() -> new RuntimeException("Conversation not found"));
                assertParticipant(conv, me);

                // Mark all unread messages (sent by other person) as read
                List<Message> messages = messageRepository.findByConversationOrderByCreatedAtAsc(conv);
                messages.stream()
                                .filter(m -> !m.isRead() && !m.getSender().getId().equals(me.getId()))
                                .forEach(m -> m.setRead(true));
                messageRepository.saveAll(messages);

                return messages.stream().map(m -> toMessageDTO(m, me)).toList();
        }

        // ── Send a message ──────────────────────────────────────────────────────
        public MessageDTO sendMessage(UUID conversationId, String email,
                        String typeStr, String content) {
                User me = getUser(email);
                Conversation conv = conversationRepository.findById(conversationId)
                                .orElseThrow(() -> new RuntimeException("Conversation not found"));
                assertParticipant(conv, me);

                MessageType type = MessageType.valueOf(typeStr.toUpperCase());

                Message message = messageRepository.save(
                                Message.builder()
                                                .conversation(conv)
                                                .sender(me)
                                                .type(type)
                                                .content(content)
                                                .isRead(false)
                                                .build());

                MessageDTO dto = toMessageDTO(message, me);

                // ── Identify recipient ──────────────────────────────────────────────
                User recipient = conv.getParticipant1().getId().equals(me.getId())
                                ? conv.getParticipant2()
                                : conv.getParticipant1();

                // ── Push real-time message to recipient's message queue ─────────────
                messagingTemplate.convertAndSendToUser(
                                recipient.getEmail(),
                                "/queue/messages",
                                dto);

                // ── Save notification and push to recipient's notification queue ────
                String preview = switch (type) {
                        case IMAGE -> me.getName() + " sent you a photo";
                        case VOICE -> me.getName() + " sent you a voice note";
                        default -> me.getName() + " sent you a message: " +
                                        (content.length() > 40 ? content.substring(0, 40) + "…" : content);
                };

                Notification notification = Notification.builder()
                                .user(recipient)
                                .message(preview)
                                .readStatus(false)
                                .createdAt(LocalDateTime.now())
                                .build();
                notificationRepository.save(notification);

                messagingTemplate.convertAndSendToUser(
                                recipient.getEmail(),
                                "/queue/notifications",
                                notification);

                return dto;
        }

        // ── Contacts — all users except self ────────────────────────────────────
        public List<UserDTO> getContacts(String email) {
                User me = getUser(email);
                return userRepository.findAll().stream()
                                .filter(u -> !u.getId().equals(me.getId()))
                                .map(this::toUserDTO)
                                .toList();
        }

        public List<Object> getMessageRequests(String email) {
                getUser(email);
                return List.of();
        }

        public void acceptRequest(UUID requestId, String email) {
                getUser(email);
        }

        public void declineRequest(UUID requestId, String email) {
                getUser(email);
        }

        public void deleteConversation(UUID conversationId, String email) {
                User me = getUser(email);

                Conversation conv = conversationRepository.findById(conversationId)
                                .orElseThrow(() -> new RuntimeException("Conversation not found"));

                assertParticipant(conv, me);

                messageRepository.deleteByConversationId(conversationId);
                conversationRepository.delete(conv);
        }

        public void blockUser(UUID userId, String email) {
                getUser(email);
                userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("User not found"));
        }

        public void reportUser(UUID userId, String reason, String email) {
                getUser(email);
                userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("User not found"));
                System.out.println("User reported: " + userId + " reason: " + reason);
        }

        // ── Safety check: logged-in user must be in the conversation ───────────
        private void assertParticipant(Conversation c, User me) {
                boolean isParticipant = c.getParticipant1().getId().equals(me.getId())
                                || c.getParticipant2().getId().equals(me.getId());
                if (!isParticipant)
                        throw new RuntimeException("Access denied");
        }

        // ── Mappers ─────────────────────────────────────────────────────────────
        private ConversationDTO toConversationDTO(Conversation c, User me) {
                User other = c.getParticipant1().getId().equals(me.getId())
                                ? c.getParticipant2()
                                : c.getParticipant1();

                List<Message> messages = messageRepository.findByConversationOrderByCreatedAtAsc(c);

                String lastMsg = "";
                String lastType = "TEXT";
                java.time.LocalDateTime lastAt = c.getCreatedAt();

                if (!messages.isEmpty()) {
                        Message last = messages.get(messages.size() - 1);
                        lastType = last.getType().name();
                        lastAt = last.getCreatedAt();
                        lastMsg = switch (last.getType()) {
                                case IMAGE -> "Sent a photo";
                                case VOICE -> "Voice note";
                                default -> last.getContent();
                        };
                }

                long unread = messages.stream()
                                .filter(m -> !m.isRead() && !m.getSender().getId().equals(me.getId()))
                                .count();

                ConversationDTO dto = new ConversationDTO();
                dto.setId(c.getId());
                dto.setOtherUserId(other.getId());
                dto.setOtherUserName(other.getName());
                dto.setOtherUserAvatar(other.getProfileImage());
                dto.setOtherUserOnline(false);
                dto.setLastMessage(lastMsg);
                dto.setLastMessageType(lastType);
                dto.setLastMessageAt(lastAt);
                dto.setUnreadCount(unread);
                return dto;
        }

        private MessageDTO toMessageDTO(Message m, User me) {
                MessageDTO dto = new MessageDTO();
                dto.setId(m.getId());
                dto.setConversationId(m.getConversation().getId());
                dto.setSenderId(m.getSender().getId());
                dto.setSenderName(m.getSender().getName());
                dto.setSenderAvatar(m.getSender().getProfileImage());
                dto.setType(m.getType());
                dto.setContent(m.getContent());
                dto.setRead(m.isRead());
                dto.setCreatedAt(m.getCreatedAt());
                return dto;
        }

        private UserDTO toUserDTO(User u) {
                UserDTO dto = new UserDTO();
                dto.setId(u.getId());
                dto.setName(u.getName());
                dto.setUsername(u.getUsername());
                dto.setEmail(u.getEmail());
                dto.setProfileImage(u.getProfileImage());
                dto.setBio(u.getBio());
                dto.setPremium(u.isPremium());
                return dto;
        }
}
