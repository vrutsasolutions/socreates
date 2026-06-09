package com.ideaspark.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import java.net.URI;

@Configuration
public class R2Config{
    @Value("${Cloudflare.r2.account-id}")
    private String accountId;

    @Value("${Cloudflare.r2.access-key}")
    private String accessKey;

    @Value("${Cloudflare.r2.secret-key}")
    private String secretKey;

    



public class R2Config {
    
}
