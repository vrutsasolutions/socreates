package com.ideaspark.service;

import com.ideaspark.dto.PlagiarismResult;
import com.ideaspark.repository.IdeaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class PlagiarismService {

    private final IdeaRepository ideaRepository;

    // Reject if similarity is above this threshold
    private static final double THRESHOLD = 0.75;

    public PlagiarismResult check(String newText) {
        List<String> existing = ideaRepository.findAllDescriptions();

        for (String desc : existing) {
            double score = cosineSimilarity(newText, desc);
            if (score >= THRESHOLD) {
                PlagiarismResult result = new PlagiarismResult();
                result.setPlagiarized(true);
                result.setSimilarityScore(score);
                result.setMessage("Your idea is " + Math.round(score * 100) +
                                  "% similar to an existing idea. Please make it more original.");
                return result;
            }
        }

        PlagiarismResult result = new PlagiarismResult();
        result.setPlagiarized(false);
        result.setSimilarityScore(0);
        result.setMessage("Content is original.");
        return result;
    }

    // ── TF-IDF Cosine Similarity ─────────────────────────────
    private double cosineSimilarity(String text1, String text2) {
        Map<String, Integer> freq1 = termFrequency(text1);
        Map<String, Integer> freq2 = termFrequency(text2);

        Set<String> allTerms = new HashSet<>(freq1.keySet());
        allTerms.addAll(freq2.keySet());

        double dotProduct = 0, norm1 = 0, norm2 = 0;

        for (String term : allTerms) {
            int f1 = freq1.getOrDefault(term, 0);
            int f2 = freq2.getOrDefault(term, 0);
            dotProduct += (double) f1 * f2;
            norm1 += (double) f1 * f1;
            norm2 += (double) f2 * f2;
        }

        if (norm1 == 0 || norm2 == 0) return 0;
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    private Map<String, Integer> termFrequency(String text) {
        Map<String, Integer> freq = new HashMap<>();
        String[] words = text.toLowerCase()
                             .replaceAll("[^a-z0-9 ]", "")
                             .split("\\s+");
        for (String word : words) {
            if (word.length() > 2) {
                freq.merge(word, 1, Integer::sum);
            }
        }
        return freq;
    }
}
