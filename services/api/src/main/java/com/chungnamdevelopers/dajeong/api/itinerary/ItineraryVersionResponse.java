package com.chungnamdevelopers.dajeong.api.itinerary;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ItineraryVersionResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID tripId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int versionNumber,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ItineraryReason reason,
        @Schema(nullable = true) Integer previousVersionNumber,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long draftRevision,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant publishedAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<ItinerarySlotResponse> slots
) {
}
