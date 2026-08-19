package com.chungnamdevelopers.dajeong.api.itinerary;

import com.chungnamdevelopers.dajeong.api.disruption.DisruptionType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

public record ItineraryTimelineItemResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID itineraryVersionId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int versionNumber,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ItineraryReason reason,
        @Schema(nullable = true) Integer previousVersionNumber,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant occurredAt,
        @Schema(nullable = true) UUID proposalSetId,
        @Schema(nullable = true) UUID winnerProposalId,
        @Schema(nullable = true) String winnerTitle,
        @Schema(nullable = true) DisruptionType disruptionType,
        @Schema(nullable = true) String previousPlaceName,
        @Schema(nullable = true) String currentPlaceName
) {
}
