package com.chungnamdevelopers.dajeong.api.trip;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record TripSummaryResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String title,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) TripRegion region,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate startDate,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate endDate,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) TripStatus status,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) MembershipRole role,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt
) {
}
