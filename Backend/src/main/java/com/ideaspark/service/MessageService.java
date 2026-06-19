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

        // ── Free-tier messaging limit (user → Creator Pro chats only) ───────────
        // Applies only when the RECIPIENT is Creator Pro (isPremium) and the
        // SENDER is not Premium themselves. Creator replies and user↔user chats
        // stay unlimited. Lifetime cap per conversation (never resets).
        private static final int FREE_TEXT_LIMIT = 5;
        private static final int FREE_FILE_LIMIT = 1;

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

                // Hide messages the current user deleted only for themselves.
                return messages.stream()
                                .filter(m -> !m.getDeletedFor().contains(me.getId()))
                                .map(m -> toMessageDTO(m, me))
                                .toList();
        }

        // ── React to a message (toggle one emoji per user) ──────────────────────
        public MessageDTO reactToMessage(UUID messageId, String email, String emoji) {
                User me = getUser(email);
                Message m = messageRepository.findById(messageId)
                                .orElseThrow(() -> new RuntimeException("Message not found"));
                assertParticipant(m.getConversation(), me);

                String current = m.getReactions().get(me.getId());
                if (emoji == null || emoji.isBlank() || emoji.equals(current)) {
                        m.getReactions().remove(me.getId());   // toggle off / clear
                } else {
                        m.getReactions().put(me.getId(), emoji);
                }
                messageRepository.save(m);
                return toMessageDTO(m, me);
        }

        // ── Delete a message ────────────────────────────────────────────────────
        // scope "everyone": only the sender may, removes it for both parties.
        // scope "me" (default): hides it only for the requesting user.
        public void deleteMessage(UUID messageId, String email, String scope) {
                User me = getUser(email);
                Message m = messageRepository.findById(messageId)
                                .orElseThrow(() -> new RuntimeException("Message not found"));
                assertParticipant(m.getConversation(), me);

                if ("everyone".equalsIgnoreCase(scope)) {
                        if (!m.getSender().getId().equals(me.getId())) {
                                throw new RuntimeException("Only the sender can delete for everyone");
                        }
                        messageRepository.delete(m);
                } else {
                        m.getDeletedFor().add(me.getId());
                        messageRepository.save(m);
                }
        }

        // ── Send a message ──────────────────────────────────────────────────────
        public MessageDTO sendMessage(UUID conversationId, String email,
                        String typeStr, String content) {
                User me = getUser(email);
                Conversation conv = conversationRepository.findById(conversationId)
                                .orElseThrow(() -> new RuntimeException("Conversation not found"));
                assertParticipant(conv, me);

                MessageType type = MessageType.valueOf(typeStr.toUpperCase());

                checkFreeLimit(conv, me, type);

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
                        case FILE -> me.getName() + " sent you a file";
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

        // ── Free-tier messaging limit ───────────────────────────────────────────
        // Triggers when the recipient is Premium (Creator Pro) OR has the
        // verified badge, and the sender is not Premium themselves. Throws
        // (caught by GlobalExceptionHandler → 400) once the relevant cap is
        // hit. Message is prefixed "LIMIT_REACHED:" so the frontend can
        // detect it and show the upsell modal instead of a generic error toast.
        private void checkFreeLimit(Conversation conv, User sender, MessageType type) {
                User recipient = conv.getParticipant1().getId().equals(sender.getId())
                                ? conv.getParticipant2()
                                : conv.getParticipant1();

                boolean recipientIsLimited = recipient.isPremium() || recipient.isVerified();
                if (!recipientIsLimited || sender.isPremium())
                        return; // not a limited chat: normal user, or sender already Premium

                if (type == MessageType.TEXT) {
                        long used = messageRepository.countByConversationAndSenderAndType(
                                        conv, sender, MessageType.TEXT);
                        if (used >= FREE_TEXT_LIMIT) {
                                throw new RuntimeException("LIMIT_REACHED: You've used all " + FREE_TEXT_LIMIT
                                                + " free messages with this creator. Upgrade to Premium for unlimited messaging.");
                        }
                } else {
                        long used = messageRepository.countByConversationAndSenderAndTypeIn(
                                        conv, sender, List.of(MessageType.IMAGE, MessageType.VOICE, MessageType.FILE));
                        if (used >= FREE_FILE_LIMIT) {
                                throw new RuntimeException("LIMIT_REACHED: You've used your free file/media share with this creator. "
                                                + "Upgrade to Premium to share more.");
                        }
                }
        }

        // Public entry point used by MessageUploadController to block an R2
        // upload BEFORE it happens, once the free-tier file cap is hit.
        public void assertWithinFreeLimit(UUID conversationId, String email, MessageType type) {
                User me = getUser(email);
                Conversation conv = conversationRepository.findById(conversationId)
                                .orElseThrow(() -> new RuntimeException("Conversation not found"));
                assertParticipant(conv, me);
                checkFreeLimit(conv, me, type);
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
                                case FILE -> "Sent a file";
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
                // Trigger flag for the free-tier messaging limit: receiver is
                // either Premium (Creator Pro) or has the verified badge.
                dto.setOtherUserVerifiedCreator(other.isPremium() || other.isVerified());
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
                dto.setReaction(m.getReactions().get(me.getId()));
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
