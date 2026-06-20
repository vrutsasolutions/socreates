package com.ideaspark.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ideaspark.dto.ConversationDTO;
import com.ideaspark.dto.MessageDTO;
import com.ideaspark.dto.UserDTO;
import com.ideaspark.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    // GET /api/messages/conversations
    @GetMapping("/conversations")
    public List<ConversationDTO> listConversations(Authentication auth) {
        return messageService.listConversations(auth.getName());
    }

    // GET /api/messages/conversations/:id
    @GetMapping("/conversations/{id}")
    public ConversationDTO getConversation(@PathVariable UUID id, Authentication auth) {
        return messageService.getConversation(id, auth.getName());
    }

    // POST /api/messages/conversations body: { "userId": "uuid" }
    @PostMapping("/conversations")
    public ConversationDTO startConversation(@RequestBody Map<String, UUID> body,
            Authentication auth) {
        return messageService.startConversation(body.get("userId"), auth.getName());
    }

    // GET /api/messages/conversations/:id/messages
    @GetMapping("/conversations/{id}/messages")
    public List<MessageDTO> getMessages(@PathVariable UUID id, Authentication auth) {
        return messageService.getMessages(id, auth.getName());
    }

    // POST /api/messages/conversations/:id/messages
    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<MessageDTO> sendMessage(@PathVariable UUID id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        MessageDTO sent = messageService.sendMessage(
                id, auth.getName(),
                body.get("type"),
                body.get("content"));
        return ResponseEntity.ok(sent);
    }

    // POST /api/messages/messages/:id/react   body: { "emoji": "❤️" }
    // Sending the same emoji again (or empty) clears the reaction.
    @PostMapping("/messages/{id}/react")
    public MessageDTO reactToMessage(@PathVariable UUID id,
                                     @RequestBody Map<String, String> body,
                                     Authentication auth) {
        return messageService.reactToMessage(id, auth.getName(), body.get("emoji"));
    }

    // DELETE /api/messages/messages/:id?scope=me|everyone
    @DeleteMapping("/messages/{id}")
    public ResponseEntity<Map<String, String>> deleteMessage(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "me") String scope,
            Authentication auth) {
        messageService.deleteMessage(id, auth.getName(), scope);
        return ResponseEntity.ok(Map.of("message", "Message deleted"));
    }

    // GET /api/messages/contacts
    @GetMapping("/contacts")
    public List<UserDTO> getContacts(Authentication auth) {
        return messageService.getContacts(auth.getName());
    }

    // GET /api/messages/active
    @GetMapping("/active")
    public List<Object> getActiveUsers(Authentication auth) {
        return Collections.emptyList();
    }

    // ✅ POST /api/messages/share-post
    // body: { "postId": "uuid", "title": "string", "userIds": ["uuid1", "uuid2"] }
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

            // Serialize an idea snapshot into the IDEA message's content so the
            // chat can render a tappable card that links back to the idea.
            Map<String, Object> snapshot = new HashMap<>();
            snapshot.put("ideaId", postId);
            snapshot.put("title", title);
            snapshot.put("imageUrl", imageUrl);
            snapshot.put("isPremium", isPremium);
            String ideaJson = new ObjectMapper().writeValueAsString(snapshot);

            // Send a message to each selected user
            for (String userId : userIds) {
                try {
                    UUID targetUserId = UUID.fromString(userId);
                    // Start or get existing conversation
                    ConversationDTO conversation = messageService
                            .startConversation(targetUserId, auth.getName());

                    // Send the shared idea as an IDEA-type message
                    messageService.sendMessage(
                            conversation.getId(),
                            auth.getName(),
                            "IDEA",
                            ideaJson);
                } catch (Exception e) {
                    System.out.println("Failed to share with user " + userId + ": " + e.getMessage());
                }
            }

            return ResponseEntity.ok(Map.of(
                    "shared", postId,
                    "count", userIds.size(),
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

    @PostMapping("/users/{id}/block")
    public ResponseEntity<Map<String, String>> blockUser(
            @PathVariable UUID id,
            Authentication auth) {
        messageService.blockUser(id, auth.getName());
        return ResponseEntity.ok(Map.of("message", "User blocked"));
    }

    @PostMapping("/users/{id}/report")
    public ResponseEntity<Map<String, String>> reportUser(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        messageService.reportUser(id, body.getOrDefault("reason", ""), auth.getName());
        return ResponseEntity.ok(Map.of("message", "User reported"));
    }
}