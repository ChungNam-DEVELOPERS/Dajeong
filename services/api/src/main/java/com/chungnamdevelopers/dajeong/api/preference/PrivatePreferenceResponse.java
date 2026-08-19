package com.chungnamdevelopers.dajeong.api.preference;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PrivatePreferenceResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID tripId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID userId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int budgetPerPerson,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int activityLevel,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int travelTolerance,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        List<PreferenceCategory> preferredCategories,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        List<PreferencePriority> priorities,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant submittedAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant updatedAt
) {
}
