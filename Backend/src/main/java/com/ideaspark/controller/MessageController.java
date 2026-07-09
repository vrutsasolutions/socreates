package com.ideaspark.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ideaspark.dto.ConversationDTO;
import com.ideaspark.dto.MessageDTO;
import com.ideaspark.dto.UserDTO;
import com.ideaspark.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @GetMapping("/conversations")
    public List<ConversationDTO> listConversations(Authentication auth) {
        return messageService.listConversations(auth.getName());
    }

    @GetMapping("/conversations/{id}")
    public ConversationDTO getConversation(@PathVariable UUID id, Authentication auth) {
        return messageService.getConversation(id, auth.getName());
    }

    @PostMapping("/conversations")
    public ConversationDTO startConversation(@RequestBody Map<String, UUID> body,
            Authentication auth) {
        return messageService.startConversation(body.get("userId"), auth.getName());
    }

    @GetMapping("/conversations/{id}/messages")
    public List<MessageDTO> getMessages(@PathVariable UUID id, Authentication auth) {
        return messageService.getMessages(id, auth.getName());
    }

    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<MessageDTO> sendMessage(@PathVariable UUID id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        MessageDTO sent = messageService.sendMessage(
                id,
                auth.getName(),
                body.get("type"),
                body.get("content"));

        return ResponseEntity.ok(sent);
    }

    @PostMapping("/messages/{id}/react")
    public MessageDTO reactToMessage(@PathVariable UUID id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        return messageService.reactToMessage(id, auth.getName(), body.get("emoji"));
    }

    @DeleteMapping("/messages/{id}")
    public ResponseEntity<Map<String, String>> deleteMessage(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "me") String scope,
            Authentication auth) {

        messageService.deleteMessage(id, auth.getName(), scope);
        return ResponseEntity.ok(Map.of("message", "Message deleted"));
    }

    @GetMapping("/contacts")
    public List<UserDTO> getContacts(Authentication auth) {
        return messageService.getContacts(auth.getName());
    }

    @GetMapping("/active")
    public List<Object> getActiveUsers(Authentication auth) {
        return Collections.emptyList();
    }

    @GetMapping("/blocked")
    public ResponseEntity<List<UserDTO>> getBlockedUsers(Authentication auth) {
        return ResponseEntity.ok(messageService.getBlockedUsers(auth.getName()));
    }

    @PostMapping("/share-post")
    public ResponseEntity<Map<String, Object>> sharePost(
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        try {
            String title = (String) body.get("title");
            String postId = String.valueOf(body.get("postId"));
            String imageUrl = (String) body.get("imageUrl");
            boolean isPremium = Boolean.TRUE.equals(body.get("isPremium"));

            @SuppressWarnings("unchecked")
            List<String> userIds = (List<String>) body.get("userIds");

            if (userIds == null || userIds.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "No users selected"));
            }

            Map<String, Object> snapshot = new HashMap<>();
            snapshot.put("ideaId", postId);
            snapshot.put("title", title);
            snapshot.put("imageUrl", imageUrl);
            snapshot.put("isPremium", isPremium);

            String ideaJson = new ObjectMapper().writeValueAsString(snapshot);

            int succeeded = 0;
            String firstError = null;
            List<Map<String, String>> results = new ArrayList<>();

            for (String userId : userIds) {
                try {
                    UUID targetUserId = UUID.fromString(userId);

                    ConversationDTO conversation = messageService
                            .startConversation(targetUserId, auth.getName());

                    messageService.sendMessage(
                            conversation.getId(),
                            auth.getName(),
                            "IDEA",
                            ideaJson);

                    succeeded++;

                    results.add(Map.of(
                            "userId", userId,
                            "conversationId", conversation.getId().toString()));
                } catch (Exception e) {
                    if (firstError == null) {
                        firstError = e.getMessage();
                    }

                    System.out.println("Failed to share with user " + userId + ": " + e.getMessage());
                }
            }

            if (succeeded == 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                firstError != null ? firstError : "Could not share post"));
            }

            return ResponseEntity.ok(Map.of(
                    "shared", postId,
                    "count", succeeded,
                    "results", results,
                    "message", "Post shared successfully"));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Failed to share post: " + e.getMessage()));
        }
    }

    @GetMapping("/requests")
    public ResponseEntity<List<Object>> getRequests(Authentication auth) {
        return ResponseEntity.ok(messageService.getMessageRequests(auth.getName()));
    }

    @PostMapping("/requests/{id}/accept")
    public ResponseEntity<Map<String, String>> acceptRequest(
            @PathVariable UUID id,
            Authentication auth) {

        messageService.acceptRequest(id, auth.getName());
        return ResponseEntity.ok(Map.of("message", "Request accepted"));
    }

    @PostMapping("/requests/{id}/decline")
    public ResponseEntity<Map<String, String>> declineRequest(
            @PathVariable UUID id,
            Authentication auth) {

        messageService.declineRequest(id, auth.getName());
        return ResponseEntity.ok(Map.of("message", "Request declined"));
    }

    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<Map<String, String>> deleteConversation(
            @PathVariable UUID id,
            Authentication auth) {

        messageService.deleteConversation(id, auth.getName());
        return ResponseEntity.ok(Map.of("message", "Conversation deleted"));
    }

    @PostMapping("/block/{userId}")
    public ResponseEntity<Map<String, String>> blockUser(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserDetails user) {

        messageService.blockUser(userId, user.getUsername());
        return ResponseEntity.ok(Map.of("message", "User blocked successfully"));
    }

    @DeleteMapping("/block/{userId}")
    public ResponseEntity<Map<String, String>> unblockUser(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserDetails user) {

        messageService.unblockUser(userId, user.getUsername());
        return ResponseEntity.ok(Map.of("message", "User unblocked successfully"));
    }

    @PostMapping("/report/{userId}")
    public ResponseEntity<Map<String, String>> reportUser(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails user) {

        String reason = body.getOrDefault("reason", "");
        messageService.reportUser(userId, reason, user.getUsername());

        return ResponseEntity.ok(Map.of("message", "User reported successfully"));
    }
}