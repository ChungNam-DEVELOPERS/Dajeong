package com.chungnamdevelopers.dajeong.api.trip;

public record TripCreationResult(
        TripSummaryResponse trip,
        boolean created
) {
}
