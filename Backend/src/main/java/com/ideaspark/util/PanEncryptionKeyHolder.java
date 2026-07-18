package com.ideaspark.util;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Bridges the PAN_ENCRYPTION_KEY property into PanCryptoConverter.
 *
 * PanCryptoConverter is instantiated directly by Hibernate (not by Spring),
 * so it cannot use @Value or constructor injection itself. Spring Boot
 * resolves ${PAN_ENCRYPTION_KEY} from real env vars, system properties, and
 * spring-dotenv's .env-backed PropertySource - the same mechanism used for
 * DB_PASSWORD/JWT_SECRET elsewhere in this project. This bean grabs the
 * resolved value once at startup and stores it statically so the converter
 * can read it.
 */
@Component
public class PanEncryptionKeyHolder {

    private static volatile String key;

    @Value("${PAN_ENCRYPTION_KEY:}")
    private String injectedKey;

    @PostConstruct
    public void init() {
        key = injectedKey;
    }

    public static String getKey() {
        return key;
    }
}