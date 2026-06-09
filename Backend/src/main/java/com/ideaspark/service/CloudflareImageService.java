package com.ideaspark.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class CloudflareImageService {
    
    @Value("${cloudflare.account.id}")
    private String accountId;

    @Value("${cloudflare.api.token}")
    private String apiToken;
    private final ObjectMapper objectMapper;
    
    public String upload(MultipartFile file){
        try{
            if(file==null|| file.isEmpty()){
                return null;
            }
            String uploadUrl="https://api.cloudflare.com/client/v4/accounts/"+accountId+"/images/v1";

            HttpHeaders headers=new HttpHeaders();
            headers.setBearerAuth(apiToken);
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            ByteArrayResource fileResource=new ByteArrayResource(file.getBytes()){
                @Override
                public String getFilename(){
                    return file.getOriginalFilename();
                }
            };
            MultiValueMap<String,Object> body=new LinkedMultiValueMap<>();
            body.add("file",fileResource);

            HttpEntity<MultiValueMap<String,Object>> requestEntity=new HttpEntity<>(body,headers);
            RestTemplate restTemplate=new RestTemplate();
            ResponseEntity<String> response=restTemplate.postForEntity(uploadUrl,requestEntity,String.class);

            JsonNode json=objectMapper.readTree(response.getBody());
            if(!json.get("success").asBoolean()){
                throw new RuntimeException("Cloudflare upload failed:"+response.getBody());
            }
            return json.get("result").get("variants").get(0).asText();
        }
        catch(Exception e){
            throw new RuntimeException("Cloudflare image upload failed:" + e.getMessage(),e);
        }
    }

}
