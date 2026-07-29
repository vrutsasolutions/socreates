package com.ideaspark;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import jakarta.annotation.PostConstruct;
import java.util.TimeZone;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class IdeasparkApplication {

    public static void main(String[] args) {
        SpringApplication.run(IdeasparkApplication.class, args);
    }

    /**
     * Force JVM timezone to UTC so LocalDateTime.now() returns UTC
     * everywhere — local dev machine (IST), AWS EB (already UTC), etc.
     * The frontend's parseCreatedAt() treats these values as UTC and
     * converts to the user's local timezone for display.
     */
    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }
}
