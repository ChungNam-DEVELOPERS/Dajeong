package com.chungnamdevelopers.dajeong.api.proposal;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ProposalSetResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID disruptionId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID tripId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID itineraryVersionId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ProposalSetStatus status,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int candidateLimit,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int candidateCount,
        @Schema(nullable = true) String shortageReason,
        @Schema(nullable = true) String failureCode,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt,
        @Schema(nullable = true) Instant startedAt,
        @Schema(nullable = true) Instant completedAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant updatedAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<ProposalResponse> proposals
) {
}
