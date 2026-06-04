package com.ideaspark.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.*;
import java.util.UUID;

@Service

public class LocalFileStorageService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Value("${app.base-url}")
    private String baseUrl;

    public String upload(MultipartFile file) throws Exception{
        if(file == null || file.isEmpty()){
            return null;
        }
        Files.createDirectories(Paths.get(uploadDir));
        String originalName=file.getOriginalFilename();
        String extension="";

        if(originalName != null && originalName.contains(".")){
            extension=originalName.substring(originalName.lastIndexOf("."));

        }
        String fileName=UUID.randomUUID()+extension;
        Path filePath=Paths.get(uploadDir,fileName);

        Files.copy(file.getInputStream(),filePath,StandardCopyOption.REPLACE_EXISTING);

        return baseUrl+ "/uploads/" +fileName;


    }
    
}
