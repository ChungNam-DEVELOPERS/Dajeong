package com.chungnamdevelopers.dajeong.api.preference;

import com.chungnamdevelopers.dajeong.api.trip.MembershipRole;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

public record PreferenceMemberStatusResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID memberId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String displayName,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) MembershipRole role,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean submitted
) {
}
