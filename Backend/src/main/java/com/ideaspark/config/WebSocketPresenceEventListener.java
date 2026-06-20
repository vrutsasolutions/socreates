package com.ideaspark.config;

import com.ideaspark.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Component
@RequiredArgsConstructor
public class WebSocketPresenceEventListener {

    private final PresenceService presenceService;

    @EventListener
    public void handleConnect(SessionConnectEvent event) {
        System.out.println("WEBSOCKET CONNECT");

        Principal user = event.getUser();
        if (user != null) {
            System.out.println("USER CONNECTED: " + user.getName());
            presenceService.markOnline(user.getName());
        }
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        System.out.println("WEBSOCKET DISCONNECT");

        Principal user = event.getUser();
        if (user != null) {
            System.out.println("USER DISCONNECTED: " + user.getName());
            presenceService.markOffline(user.getName());
        }
    }
}