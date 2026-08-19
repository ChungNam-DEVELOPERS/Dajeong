package com.chungnamdevelopers.dajeong.api.trip;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

public record TripListResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        List<TripSummaryResponse> items,
        String nextCursor
) {
    public TripListResponse {
        items = List.copyOf(items);
    }
}
