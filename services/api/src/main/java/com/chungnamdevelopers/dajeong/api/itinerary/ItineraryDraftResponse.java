package com.chungnamdevelopers.dajeong.api.itinerary;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

public record ItineraryDraftResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID tripId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long revision,
        @Schema(nullable = true) Long publishedRevision,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<ItinerarySlotResponse> slots
) {
}
