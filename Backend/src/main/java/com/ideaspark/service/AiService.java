package com.ideaspark.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
public class AiService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL = "llama-3.3-70b-versatile";

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Random random = new Random();

    private static final String[] IDEA_CATEGORIES = {
            "Education",
            "Healthcare",
            "FinTech",
            "Agriculture",
            "Travel",
            "Gaming",
            "Music",
            "Fashion",
            "Sports",
            "Robotics",
            "Productivity",
            "Social Impact",
            "Cybersecurity",
            "Smart Home",
            "Climate Tech",
            "Creator Economy",
            "E-commerce",
            "Transportation",
            "Pet Care",
            "Legal Tech"
    };

    public Map<String, String> refineIdea(String title, String description, String mode) {

        String safeTitle = title == null ? "" : title.trim();
        String safeDesc = description == null ? "" : description.trim();

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

        String requestBody;
        try {
            requestBody = objectMapper.writeValueAsString(Map.of(
                    "model", MODEL,
                    "messages", List.of(Map.of("role", "user", "content", userPrompt)),
                    "temperature", "grammar".equals(mode) ? 0.1 : 0.7
            ));
        } catch (Exception e) {
            throw new RuntimeException("Failed to build Groq request body", e);
        }

        HttpHeaders headers = buildHeaders();
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

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

        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            String rawText = root
                    .path("choices").get(0)
                    .path("message")
                    .path("content")
                    .asText();

            String cleanJson = rawText
                    .replaceAll("(?s)```json\\s*", "")
                    .replaceAll("(?s)```\\s*", "")
                    .trim();

            JsonNode result = objectMapper.readTree(cleanJson);

            return Map.of(
                    "title", result.path("title").asText(title),
                    "description", result.path("description").asText(description)
            );

        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Groq response: " + e.getMessage(), e);
        }
    }

    public Map<String, String> chat(String message, String mode) {

        String safeMessage = message == null ? "" : message.trim();
        String safeMode = mode == null ? "chat" : mode.trim().toLowerCase();

        String selectedCategory = IDEA_CATEGORIES[random.nextInt(IDEA_CATEGORIES.length)];
        long seed = System.currentTimeMillis();

        String systemPrompt = """
                You are SparkBot, the official AI assistant for SoCreate.

                Help users generate, refine, validate, summarize, and improve startup or project ideas.

                Important rules:
                1. Never repeat the same idea twice.
                2. Every generated idea must be fresh, specific, and different from previous responses.
                3. If the mode is generate, create a new unique idea with:
                   - Idea Title
                   - Category
                   - Description
                   - Key Features
                   - Next Steps
                4. Avoid generic names like EcoCycle, EduMind, DreamScape, SoundScape, FreshFix, FreshPick, FreshPlate.
                5. Do not reuse the same industry repeatedly.
                6. Do not use "scape", "mind", "cycle", "connect", "hub", "fresh", or "pick" repeatedly in titles.
                7. Each title must use a different naming style.
                8. Prefer simple realistic product names, not always fancy brand names.
                9. Keep replies clear, friendly, practical, and concise.
                10. Do not mention the random seed to the user.
                """;

        boolean isGenerateRequest =
                "generate".equalsIgnoreCase(safeMode)
                        || safeMessage.toLowerCase().contains("generate idea")
                        || safeMessage.toLowerCase().contains("startup idea")
                        || safeMessage.toLowerCase().contains("new idea");

        String userPrompt;

        if (isGenerateRequest) {
            userPrompt = """
                    Mode: generate

                    User message:
                    %s

                    Generate a completely new startup idea.

                    Requirements:
                    - Use this category only: %s
                    - Do not repeat previous ideas.
                    - Do not use food waste, grocery surplus, near-expired ingredients, recycling, or repeated "Fresh" style ideas unless the selected category truly requires it.
                    - Create a fresh and realistic idea title.
                    - Include exactly these sections:
                      🚀 Let's create something new.

                      Idea Title:
                      Category:
                      Description:
                      Key Features:
                      Next Steps:

                    Random seed for internal variation: %s
                    """.formatted(safeMessage, selectedCategory, seed);
        } else {
            userPrompt = """
                    Mode: %s

                    User message:
                    %s

                    Reply as SparkBot in a helpful, practical, and concise way.
                    """.formatted(safeMode, safeMessage);
        }

        String requestBody;
        try {
            requestBody = objectMapper.writeValueAsString(Map.of(
                    "model", MODEL,
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", userPrompt)
                    ),
                    "temperature", isGenerateRequest ? 1.0 : 0.7
            ));
        } catch (Exception e) {
            throw new RuntimeException("Failed to build Groq chat request body", e);
        }

        HttpEntity<String> entity = new HttpEntity<>(requestBody, buildHeaders());

        ResponseEntity<String> response;
        try {
            response = restTemplate.exchange(
                    GROQ_URL,
                    HttpMethod.POST,
                    entity,
                    String.class
            );
        } catch (Exception e) {
            throw new RuntimeException("Groq chatbot API call failed: " + e.getMessage(), e);
        }

        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            String reply = root
                    .path("choices").get(0)
                    .path("message")
                    .path("content")
                    .asText();

            return Map.of("reply", reply);

        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Groq chatbot response: " + e.getMessage(), e);
        }
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + groqApiKey);
        return headers;
    }
}