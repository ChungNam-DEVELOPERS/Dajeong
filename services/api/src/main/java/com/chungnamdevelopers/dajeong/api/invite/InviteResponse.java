package com.chungnamdevelopers.dajeong.api.invite;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

public record InviteResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        String code,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        Instant expiresAt
) {
}
