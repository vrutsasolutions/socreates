package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "idea_likes",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "idea_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IdeaLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "idea_id")
    private Idea idea;
}