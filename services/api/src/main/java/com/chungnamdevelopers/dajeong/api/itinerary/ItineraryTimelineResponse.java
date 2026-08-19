package com.chungnamdevelopers.dajeong.api.itinerary;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

public record ItineraryTimelineResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID tripId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        List<ItineraryTimelineItemResponse> items,
        @Schema(nullable = true) String nextCursor
) {
    public ItineraryTimelineResponse {
        items = List.copyOf(items);
    }
}
