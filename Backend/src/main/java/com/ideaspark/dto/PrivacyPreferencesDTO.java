package com.ideaspark.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Currently just the one toggle (Activity Status). Public Profile is not
// user-controllable yet — Settings.jsx keeps it hard-locked ON — so it has
// no backend field or entry here.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrivacyPreferencesDTO {
    private boolean showActivityStatus;
}
