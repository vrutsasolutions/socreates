package com.ideaspark.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class AiService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL    = "llama-3.3-70b-versatile";

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Refines the given title and description using Groq AI.
     *
     * @param title       raw idea title typed by the user
     * @param description raw idea description typed by the user
     * @param mode        "enhance" → full rewrite for clarity & impact
     *                    "grammar" → spelling/grammar fixes only, no rephrasing
     */
    public Map<String, String> refineIdea(String title, String description, String mode) {

        String safeTitle = title       == null ? "" : title.trim();
        String safeDesc  = description == null ? "" : description.trim();

        // ── 1. Pick prompt based on mode ─────────────────────────────────────
        String userPrompt;

        if ("grammar".equals(mode)) {
            userPrompt = """
                You are a spelling and grammar assistant for an idea-sharing platform called IdeaSpark.
                The user has written an idea title and description.

                Your task — STRICT rules:
                1. Fix ALL spelling mistakes.
                2. Fix ALL grammatical errors and punctuation issues.
                3. Fix sentence formation where clearly broken.
                4. Do NOT rephrase, restructure, or improve sentences beyond fixing errors.
                5. Do NOT add new words, ideas, or change the meaning in any way.
                6. Keep every sentence as close to the original as possible.

                Return ONLY a valid JSON object — no markdown, no code fences, no explanation:
                {"title":"<corrected title>","description":"<corrected description>"}

                User's input:
                TITLE: %s
                DESCRIPTION: %s
                """.formatted(safeTitle, safeDesc);
        } else {
            // default: "enhance"
            userPrompt = """
                You are a writing assistant for an idea-sharing platform called IdeaSpark.
                The user has written an idea title and description that may be rough or unclear.

                Your task:
                1. Fix ALL spelling and grammatical mistakes.
                2. Rewrite for clarity, flow, and impact — make it compelling to read.
                3. Keep the core idea EXACTLY the same — do not add features or change the concept.
                4. Keep the title concise (under 15 words).
                5. Keep the description under 500 words.
                6. Use confident, engaging language suitable for a startup idea platform.

                Return ONLY a valid JSON object — no markdown, no code fences, no explanation:
                {"title":"<enhanced title>","description":"<enhanced description>"}

                User's input:
                TITLE: %s
                DESCRIPTION: %s
                """.formatted(safeTitle, safeDesc);
        }

        // ── 2. Build Groq request body (OpenAI-compatible) ────────────────────
        String requestBody;
        try {
            requestBody = objectMapper.writeValueAsString(Map.of(
                "model",       MODEL,
                "messages",    List.of(Map.of("role", "user", "content", userPrompt)),
                "temperature", "grammar".equals(mode) ? 0.1 : 0.7
            ));
        } catch (Exception e) {
            throw new RuntimeException("Failed to build Groq request body", e);
        }

        // ── 3. Headers — API key as Bearer token ──────────────────────────────
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + groqApiKey);

        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

        // ── 4. Call Groq ──────────────────────────────────────────────────────
        ResponseEntity<String> response;
        try {
            response = restTemplate.exchange(
                GROQ_URL,
                HttpMethod.POST,
                entity,
                String.class
            );
        } catch (Exception e) {
            throw new RuntimeException("Groq API call failed: " + e.getMessage(), e);
        }

        // ── 5. Parse response: choices[0].message.content ─────────────────────
        try {
            JsonNode root    = objectMapper.readTree(response.getBody());
            String rawText   = root
                .path("choices").get(0)
                .path("message")
                .path("content")
                .asText();

            // Strip accidental markdown fences
            String cleanJson = rawText
                .replaceAll("(?s)```json\\s*", "")
                .replaceAll("(?s)```\\s*",     "")
                .trim();

            JsonNode result = objectMapper.readTree(cleanJson);

            return Map.of(
                "title",       result.path("title").asText(title),
                "description", result.path("description").asText(description)
            );

        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Groq response: " + e.getMessage(), e);
        }
    }
}
