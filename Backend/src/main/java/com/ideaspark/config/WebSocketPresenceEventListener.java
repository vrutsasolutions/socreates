package com.ideaspark.config;

import com.ideaspark.service.PresenceService;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketPresenceEventListener {

    private final PresenceService presenceService;

    @EventListener
    public void handleConnect(SessionConnectEvent event) {
        log.info("WebSocket CONNECT");

        Principal user = event.getUser();
        if (user != null) {
            log.info("User connected: {}", user.getName());
            presenceService.markOnline(user.getName());
        }
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        log.info("WebSocket DISCONNECT");

        Principal user = event.getUser();
        if (user != null) {
            log.info("User disconnected: {}", user.getName());
            presenceService.markOffline(user.getName());
        }
    }
}