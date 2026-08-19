package com.chungnamdevelopers.dajeong.api.notification;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) NotificationType type,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID tripId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String tripTitle,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID proposalSetId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID itineraryVersionId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int itineraryVersionNumber,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID winnerProposalId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String winnerTitle,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt,
        @Schema(nullable = true) Instant readAt
) {
}
