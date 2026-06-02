package com.ideaspark.controller;

import com.ideaspark.dto.PlagiarismResult;
import com.ideaspark.service.PlagiarismService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/plagiarism")
@RequiredArgsConstructor
public class PlagiarismController {

    private final PlagiarismService plagiarismService;

    @PostMapping("/check")
    public PlagiarismResult check(@RequestBody Map<String, String> request) {
        String description = request.get("description");
        return plagiarismService.check(description);
    }
}
