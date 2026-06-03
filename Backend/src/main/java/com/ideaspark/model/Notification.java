package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue

    private UUID id;
    private String message;
    private boolean readStatus;
    private LocalDateTime createdAt;

    @ManyToOne
@JoinColumn(name = "user_id")
    private User user;

    
}
