package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name="comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comment{
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable=false,length=1000)
    private String content;

    @ManyToOne
    @JoinColumn(name="idea_id")
    private Idea idea;

    @ManyToOne
    @JoinColumn(name="user_id")
    private User user;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}