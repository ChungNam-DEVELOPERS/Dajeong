package com.chungnamdevelopers.dajeong.api.preference;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

public record PreferenceStatusResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID tripId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int submittedCount,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int totalCount,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        List<PreferenceMemberStatusResponse> members
) {
}
