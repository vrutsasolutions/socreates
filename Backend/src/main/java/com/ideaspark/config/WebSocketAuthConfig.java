package com.ideaspark.config;

import com.ideaspark.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
public class WebSocketAuthConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {

            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {

                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {

                    // Previously: an invalid/missing token just skipped setUser()
                    // and let the CONNECT through anonymously — the socket stayed
                    // open, it just couldn't receive /user/queue/* pushes. That's
                    // fine for private data (Spring can't route it without a
                    // Principal) but it still let unauthenticated clients hold a
                    // connection open and read broadcast-only destinations like
                    // /topic/presence. Now we reject the CONNECT outright so every
                    // live session is tied to a verified user from the start.
                    String bearer = accessor.getFirstNativeHeader("Authorization");
                    String token = (bearer != null && bearer.startsWith("Bearer "))
                            ? bearer.substring(7)
                            : null;

                    if (token == null || !jwtUtil.isTokenValid(token)) {
                        throw new BadCredentialsException(
                                "WebSocket CONNECT rejected: missing or invalid JWT");
                    }

                    String email = jwtUtil.extractEmail(token);
                    accessor.setUser(() -> email);
                }

                return message;
            }
        });
    }
}