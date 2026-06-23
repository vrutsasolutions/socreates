package com.ideaspark;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class IdeasparkApplication {
    public static void main(String[] args) {
        SpringApplication.run(IdeasparkApplication.class, args);
    }
}
