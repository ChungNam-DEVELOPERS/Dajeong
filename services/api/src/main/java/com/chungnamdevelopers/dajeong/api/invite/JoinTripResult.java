package com.chungnamdevelopers.dajeong.api.invite;

import com.chungnamdevelopers.dajeong.api.trip.TripSummaryResponse;

public record JoinTripResult(
        TripSummaryResponse trip,
        boolean joined
) {
}
