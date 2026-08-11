package com.ideaspark.repository;

import com.ideaspark.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);

    // ── Presence ─────────────────────────────────────────────────────────
    // Bulk-reset on server startup — clears stale is_online flags left
    // behind when the previous JVM shut down without clean disconnects.
    @Modifying
    @Query("UPDATE User u SET u.online = false WHERE u.online = true")
    int resetAllOnlineStatus();

    // Active Now rail — users who are online, have activity status visible,
    // and share an ACCEPTED conversation with the given user.
    @Query("SELECT DISTINCT u FROM User u " +
           "JOIN Conversation c ON " +
           "  (c.participant1 = u AND c.participant2 = :me) OR " +
           "  (c.participant2 = u AND c.participant1 = :me) " +
           "WHERE u.online = true " +
           "  AND u.showActivityStatus = true " +
           "  AND c.status = 'ACCEPTED'")
    List<User> findOnlineContacts(@Param("me") User me);

    // ── Payout-setup reminder ─────────────────────────────────────────
    // All verified creators (active Creator Pro subscribers).
    List<User> findByIsVerifiedTrue();
}