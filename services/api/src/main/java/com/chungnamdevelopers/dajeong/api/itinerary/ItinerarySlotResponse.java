package com.chungnamdevelopers.dajeong.api.itinerary;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ItinerarySlotResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant startsAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant endsAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String placeName,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String address,
        @Schema(nullable = true) BigDecimal latitude,
        @Schema(nullable = true) BigDecimal longitude,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean indoor,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ItineraryCategory category,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int expectedCost
) {
}
