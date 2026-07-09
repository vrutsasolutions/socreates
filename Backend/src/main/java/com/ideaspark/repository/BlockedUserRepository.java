package com.ideaspark.repository;

import com.ideaspark.model.BlockedUser;
import com.ideaspark.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BlockedUserRepository extends JpaRepository<BlockedUser, UUID> {

    boolean existsByBlockerAndBlocked(User blocker, User blocked);

    Optional<BlockedUser> findByBlockerAndBlocked(User blocker, User blocked);

    List<BlockedUser> findByBlocker(User blocker);

    boolean existsByBlockerAndBlockedOrBlockerAndBlocked(
            User blocker1,
            User blocked1,
            User blocker2,
            User blocked2
    );
}