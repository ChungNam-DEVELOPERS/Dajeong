package com.chungnamdevelopers.dajeong.api.disruption;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

public record DisruptionResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID tripId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID itineraryVersionId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int itineraryVersionNumber,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID itinerarySlotId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant slotStartsAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant slotEndsAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String placeName,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) DisruptionType type,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String description,
        @Schema(nullable = true) UUID reportedByUserId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String reporterDisplayName,
        @Schema(nullable = true) Integer weatherGridX,
        @Schema(nullable = true) Integer weatherGridY,
        @Schema(nullable = true) Integer precipitationProbability,
        @Schema(nullable = true) Instant forecastAt,
        @Schema(nullable = true) Instant forecastIssuedAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) DisruptionStatus status,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant reportedAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant updatedAt
) {
}
