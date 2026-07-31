package com.ideaspark.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.converter.DefaultContentTypeResolver;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.converter.MessageConverter;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

/**
 * Ensures the STOMP message broker uses the same Jackson ObjectMapper
 * that Spring Boot auto-configures for REST (with JavaTimeModule, etc.).
 *
 * Without this, the STOMP broker creates its own ObjectMapper via
 * {@code new ObjectMapper()}, which serializes {@code LocalDateTime}
 * as an array {@code [2026,7,31,10,0,0]} instead of an ISO string
 * {@code "2026-07-31T10:00:00"}.  The REST API uses the Boot-configured
 * ObjectMapper (which has JavaTimeModule + WRITE_DATES_AS_TIMESTAMPS=false),
 * so the WebSocket and REST payloads were inconsistent — the frontend
 * received different date formats depending on the transport.
 */
@Configuration
public class WebSocketMessageConverterConfig implements WebSocketMessageBrokerConfigurer {

    private final ObjectMapper objectMapper;

    public WebSocketMessageConverterConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean configureMessageConverters(List<MessageConverter> messageConverters) {
        DefaultContentTypeResolver resolver = new DefaultContentTypeResolver();
        resolver.setDefaultMimeType(MimeTypeUtils.APPLICATION_JSON);

        MappingJackson2MessageConverter converter = new MappingJackson2MessageConverter();
        converter.setObjectMapper(objectMapper);
        converter.setContentTypeResolver(resolver);

        messageConverters.add(converter);

        // Return false → use ONLY our converters (don't add defaults).
        // The default list would include another MappingJackson2MessageConverter
        // with its own ObjectMapper, defeating the purpose.
        return false;
    }
}
