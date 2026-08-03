package com.ideaspark.repository;



import com.ideaspark.model.Notification;
import com.ideaspark.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByUserOrderByCreatedAtDesc(User user);
    long countByUserAndReadStatusFalse(User user);

    // Used when an idea is deleted, to clear stale bell entries that would
    // otherwise 404 when tapped. Scoped to BOTH referenceId AND type: this
    // column is reused across notification kinds (FOLLOW/FOLLOW_REQUEST/
    // PRIVACY_CHANGE store a USER id in referenceId, not an idea id), so
    // filtering on referenceId alone would risk deleting unrelated
    // follow-related notifications that happen to share a UUID.
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.referenceId = :ideaId AND n.type IN :types")
    void deleteByReferenceIdAndTypeIn(@Param("ideaId") UUID ideaId,
            @Param("types") List<Notification.NotificationType> types);
}
