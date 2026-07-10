package com.ideaspark.dto;

import lombok.Data;
import java.util.List;

@Data
public class ConversationMediaDTO {
    private List<MessageDTO> images;
    private List<MessageDTO> files;
    private List<MessageDTO> voiceNotes;
    private List<LinkDTO> links;
    private int totalCount;
}