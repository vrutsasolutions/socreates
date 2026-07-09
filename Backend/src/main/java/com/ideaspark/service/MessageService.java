package com.ideaspark.service;

import com.ideaspark.dto.ConversationDTO;
import com.ideaspark.dto.MessageDTO;
import com.ideaspark.dto.UserDTO;
import com.ideaspark.model.Conversation;
import com.ideaspark.model.Message;
import com.ideaspark.model.Message.MessageType;
import com.ideaspark.model.Notification;
import com.ideaspark.model.User;
import com.ideaspark.repository.BlockedUserRepository;
import com.ideaspark.repository.ConversationRepository;
import com.ideaspark.repository.MessageRepository;
import com.ideaspark.repository.NotificationRepository;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import com.ideaspark.model.BlockedUser;
import com.ideaspark.model.Report;
import com.ideaspark.repository.ReportRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ReportRepository reportRepository;
    private final NotificationRepository notificationRepository;
    private final BlockedUserRepository blockedUserRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private static final int FREE_TEXT_LIMIT = 5;
    private static final int FREE_FILE_LIMIT = 1;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    public List<ConversationDTO> listConversations(String email) {
        User me = getUser(email);
        return conversationRepository.findAllByUser(me).stream()
                .map(c -> toConversationDTO(c, me))
                .filter(dto -> dto.getLastMessageAt() != null)
                .sorted((a, b) -> b.getLastMessageAt().compareTo(a.getLastMessageAt()))
                .toList();
    }

    public ConversationDTO getConversation(UUID conversationId, String email) {
        User me = getUser(email);
        Conversation c = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        assertParticipant(c, me);
        return toConversationDTO(c, me);
    }

    public ConversationDTO startConversation(UUID otherUserId, String email) {
        User me = getUser(email);
        User other = userRepository.findById(otherUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Conversation conv = conversationRepository.findBetween(me, other)
                .orElseGet(() -> conversationRepository.save(
                        Conversation.builder()
                                .participant1(me)
                                .participant2(other)
                                .build()));

        return toConversationDTO(conv, me);
    }

    public List<MessageDTO> getMessages(UUID conversationId, String email) {
        User me = getUser(email);
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        assertParticipant(conv, me);

        List<Message> messages = messageRepository.findByConversationOrderByCreatedAtAsc(conv);

        messages.stream()
                .filter(m -> !m.isRead() && !m.getSender().getId().equals(me.getId()))
                .forEach(m -> m.setRead(true));

        messageRepository.saveAll(messages);

        messages.stream()
                .filter(m -> m.isRead())
                .filter(m -> !m.getSender().getId().equals(me.getId()))
                .forEach(m -> messagingTemplate.convertAndSendToUser(
                        m.getSender().getEmail(),
                        "/queue/read-receipts",
                        m.getId()));

        return messages.stream()
                .filter(m -> !m.getDeletedFor().contains(me.getId()))
                .map(m -> toMessageDTO(m, me))
                .toList();
    }

    public MessageDTO reactToMessage(UUID messageId, String email, String emoji) {
        User me = getUser(email);
        Message m = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        assertParticipant(m.getConversation(), me);

        String current = m.getReactions().get(me.getId());

        if (emoji == null || emoji.isBlank() || emoji.equals(current)) {
            m.getReactions().remove(me.getId());
        } else {
            m.getReactions().put(me.getId(), emoji);
        }

        messageRepository.save(m);
        return toMessageDTO(m, me);
    }

    public List<UserDTO> getBlockedUsers(String email) {
        User me = getUser(email);

        return blockedUserRepository.findByBlocker(me)
                .stream()
                .map(block -> {
                    User u = block.getBlocked();

                    UserDTO dto = new UserDTO();
                    dto.setId(u.getId());
                    dto.setName(u.getName());
                    dto.setUsername(u.getUsername());
                    dto.setEmail(u.getEmail());
                    dto.setProfileImage(u.getProfileImage());
                    dto.setBio(u.getBio());
                    dto.setPremium(u.isPremium());

                    return dto;
                })
                .toList();
    }

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

    public MessageDTO sendMessage(UUID conversationId, String email, String typeStr, String content) {
        User me = getUser(email);

        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        assertParticipant(conv, me);

        MessageType type = MessageType.valueOf(typeStr.toUpperCase());

        checkFreeLimit(conv, me, type);

        User recipient = conv.getParticipant1().getId().equals(me.getId())
                ? conv.getParticipant2()
                : conv.getParticipant1();

        boolean isBlocked = blockedUserRepository
                .existsByBlockerAndBlockedOrBlockerAndBlocked(
                        me,
                        recipient,
                        recipient,
                        me);

        if (isBlocked) {
            throw new RuntimeException(
                    "You cannot send messages because one of you has blocked the other.");
        }

        Message message = messageRepository.save(
                Message.builder()
                        .conversation(conv)
                        .sender(me)
                        .type(type)
                        .content(content)
                        .isRead(false)
                        .build());

        MessageDTO dto = toMessageDTO(message, me);

        messagingTemplate.convertAndSendToUser(
                recipient.getEmail(),
                "/queue/messages",
                dto);

        String preview = switch (type) {
            case IMAGE -> me.getName() + " sent you a photo";
            case VOICE -> me.getName() + " sent you a voice note";
            case FILE -> me.getName() + " sent you a file";
            case IDEA -> me.getName() + " shared an idea";
            default -> me.getName() + " sent you a message: " +
                    (content.length() > 40 ? content.substring(0, 40) + "…" : content);
        };

        Notification notification = Notification.builder()
                .user(recipient)
                .message(preview)
                .readStatus(false)
                .type(Notification.NotificationType.MESSAGE)
                .conversationId(conv.getId())
                .createdAt(LocalDateTime.now())
                .build();

        notificationRepository.save(notification);

        messagingTemplate.convertAndSendToUser(
                recipient.getEmail(),
                "/queue/notifications",
                notification);

        return dto;
    }

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

        User blocker = getUser(email);

        User blocked = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (blocker.getId().equals(blocked.getId())) {
            throw new RuntimeException("You cannot block yourself");
        }

        if (blockedUserRepository.existsByBlockerAndBlocked(blocker, blocked)) {
            throw new RuntimeException("User already blocked");
        }

        BlockedUser blockedUser = BlockedUser.builder()
                .blocker(blocker)
                .blocked(blocked)
                .build();

        blockedUserRepository.save(blockedUser);
    }

    public void unblockUser(UUID userId, String email) {
        User blocker = getUser(email);

        User blocked = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        BlockedUser blockedUser = blockedUserRepository
                .findByBlockerAndBlocked(blocker, blocked)
                .orElseThrow(() -> new RuntimeException("User is not blocked"));

        blockedUserRepository.delete(blockedUser);
    }

    public void reportUser(UUID userId, String reason, String email) {
        User reporter = getUser(email);

        User reportedUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (reporter.getId().equals(reportedUser.getId())) {
            throw new RuntimeException("You cannot report yourself");
        }

        Report report = Report.builder()
                .reporter(reporter)
                .reportedUser(reportedUser)
                .reason(reason)
                .status("PENDING")
                .build();

        reportRepository.save(report);
    }

    private void assertParticipant(Conversation c, User me) {
        boolean isParticipant = c.getParticipant1().getId().equals(me.getId())
                || c.getParticipant2().getId().equals(me.getId());

        if (!isParticipant) {
            throw new RuntimeException("Access denied");
        }
    }

    private void checkFreeLimit(Conversation conv, User sender, MessageType type) {
        User recipient = conv.getParticipant1().getId().equals(sender.getId())
                ? conv.getParticipant2()
                : conv.getParticipant1();

        boolean recipientIsLimited = recipient.isPremium() || recipient.isVerified();

        if (!recipientIsLimited || sender.isPremium()) {
            return;
        }

        if (type == MessageType.TEXT || type == MessageType.IDEA) {
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
                throw new RuntimeException(
                        "LIMIT_REACHED: You've used your free file/media share with this creator. "
                                + "Upgrade to Premium to share more.");
            }
        }
    }

    public void assertWithinFreeLimit(UUID conversationId, String email, MessageType type) {
        User me = getUser(email);

        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        assertParticipant(conv, me);
        checkFreeLimit(conv, me, type);
    }

    private ConversationDTO toConversationDTO(Conversation c, User me) {
        User other = c.getParticipant1().getId().equals(me.getId())
                ? c.getParticipant2()
                : c.getParticipant1();

        Message last = messageRepository
                .findTopByConversationOrderByCreatedAtDesc(c)
                .orElse(null);

        String lastMsg = "";
        String lastType = "TEXT";
        LocalDateTime lastAt = c.getCreatedAt();

        if (last != null) {
            lastType = last.getType().name();
            lastAt = last.getCreatedAt();

            lastMsg = switch (last.getType()) {
                case IMAGE -> "Sent a photo";
                case VOICE -> "Voice note";
                case FILE -> "Sent a file";
                case IDEA -> "Shared an idea";
                default -> last.getContent();
            };
        }

        long unread = messageRepository
                .countByConversationAndIsReadFalseAndSenderIdNot(c, me.getId());

        ConversationDTO dto = new ConversationDTO();
        dto.setId(c.getId());
        dto.setOtherUserId(other.getId());
        dto.setOtherUserName(other.getName());
        dto.setOtherUserAvatar(other.getProfileImage());
        dto.setOtherUserOnline(Boolean.TRUE.equals(other.getOnline()));
        dto.setOtherUserLastSeen(other.getLastSeen());
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
