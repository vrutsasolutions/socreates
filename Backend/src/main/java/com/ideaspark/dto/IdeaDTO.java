package com.ideaspark.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class IdeaDTO {
    private UUID id;
    private String title;
    private String description;

    private String imageUrl;          
    private List<String> imageUrls;   

    private UUID creatorId;
    private String creatorName;
    private String creatorImage;
    private String category;
    // Pin the JSON key to "isPremium". For a boolean field "isPremium" Lombok
    // generates the getter isPremium(); Jackson strips the "is" prefix and
    // would serialize it as "premium" instead — but the frontend reads
    // idea.isPremium everywhere (blur/lock UI, Premium page filtering), so
    // without this an idea that is genuinely premium in the DB would render
    // as a normal idea for every viewer. Same gotcha and fix as
    // FollowStatsResponse.isFollowing / UserDTO.isPremium.
    @JsonProperty("isPremium")
    private boolean isPremium;
    private int likeCount;
    private int readCount;
    private boolean savedByCurrentUser;
    private boolean likedByCurrentUser;
    private LocalDateTime createdAt;
    private long commentCount;

    // ── Free-plan premium-read cap (see IdeaService.PREMIUM_FREE_READ_LIMIT) ─
    // Normal (non-premium) ideas are never limited or locked for a signed-in
    // free reader — unlimited reading. Only PREMIUM ideas are capped: a free
    // reader may fully open up to PREMIUM_FREE_READ_LIMIT distinct premium
    // ideas, one time each (see lockReason "already_read" below). Set by
    // getById(), the idea-detail endpoint. When true, `description` is
    // deliberately blanked out server-side (not just hidden by CSS) so a
    // locked reader can't read the full text via the network response —
    // image/title/creator/category still come through as normal, matching
    // the "blurred description" product spec.
    // lockReason:
    //   "premium"      — guest (not signed in), idea is premium.
    //   "read_limit"   — signed-in free reader has already spent all
    //                    PREMIUM_FREE_READ_LIMIT slots on OTHER premium
    //                    ideas and this is a new one.
    //   "already_read" — signed-in free reader already spent a slot on THIS
    //                    premium idea earlier; re-opening the same idea a
    //                    second time never grants full access again, even
    //                    though a slot was already used and even if slots
    //                    remain — it shows the blurred version, same as a
    //                    locked idea.
    private boolean locked;
    private String lockReason;
    private Integer freeReadsUsed;
    private Integer freeReadsLimit;

    // Short, safe teaser (first sentence or ~140 chars, word-boundary cut)
    // built server-side from the real description whenever `description` is
    // being blanked out above. Lets the locked-idea UI show one legible line
    // — matching the product's "1-line preview, rest blurred" design —
    // without ever sending the rest of the paywalled text over the wire.
    private String previewText;
}
