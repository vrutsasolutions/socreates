package com.ideaspark.controller;

import com.ideaspark.dto.ConversationDTO;
import com.ideaspark.dto.MessageDTO;
import com.ideaspark.dto.UserDTO;
import com.ideaspark.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
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

    // POST /api/messages/conversations  body: { "userId": "uuid" }
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
    // body: { "type": "TEXT"|"IMAGE"|"VOICE", "content": "..." }
    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<MessageDTO> sendMessage(@PathVariable UUID id,
                                                  @RequestBody Map<String, String> body,
                                                  Authentication auth) {
        MessageDTO sent = messageService.sendMessage(
                id, auth.getName(),
                body.get("type"),
                body.get("content")
        );
        return ResponseEntity.ok(sent);
    }

    // GET /api/messages/contacts
    // Returns all users the logged-in user can start a DM with
    @GetMapping("/contacts")
    public List<UserDTO> getContacts(Authentication auth) {
        return messageService.getContacts(auth.getName());
    }

    // GET /api/messages/active
    // Returns empty list for now — online presence tracking not yet implemented.
    // Frontend uses this for the "Active Now" rail; returning [] hides the rail gracefully.
    @GetMapping("/active")
    public List<Object> getActiveUsers(Authentication auth) {
        return Collections.emptyList();
    }
}
