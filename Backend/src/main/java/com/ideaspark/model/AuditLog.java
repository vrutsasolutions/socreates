package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Maps to the existing  audit_log  table in Supabase.
 *
 * Columns (exact match):
 *   id           int8/uuid  PK
 *   user_id      uuid       nullable — null for system/webhook-originated rows
 *   action       text       — e.g. "INVALID_WEBHOOK_SIGNATURE", "DISTRIBUTION_COMPLETED"
 *   entity_type  text       — e.g. "payment", "revenue_pool", "membership"
 *   entity_id    text       — id of the affected row, stored as text so it
 *                             can hold a UUID, an int, or a Razorpay string id
 *   metadata     jsonb      — free-form details (amounts, ip, reason, etc.)
 *   created_at   timestamptz
 *
 * user_id is intentionally NULLABLE (not a hard FK requirement here) since
 * webhook signature failures and the monthly cron job both write rows with
 * no real user attached — the doc's "actor" field needs to be able to hold
 * 'system' or 'razorpay'. We store that string-y actor inside `action`/
 * `metadata` rather than forcing it into user_id.
 */
@Entity
@Table(name = "audit_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Null for system/webhook-originated actions (no real user attached). */
    @Column(name = "user_id")
    private UUID userId;

    /** e.g. "INVALID_WEBHOOK_SIGNATURE", "DISTRIBUTION_COMPLETED", "PAYMENT_CAPTURED" */
    @Column(nullable = false)
    private String action;

    /** e.g. "payment", "revenue_pool", "membership", "subscription" */
    @Column(name = "entity_type")
    private String entityType;

    /** Stored as text so it can hold a UUID, int, or Razorpay string id. */
    @Column(name = "entity_id")
    private String entityId;

    /** Free-form JSON details: amounts, reasons, source ip, etc. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String metadata;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
