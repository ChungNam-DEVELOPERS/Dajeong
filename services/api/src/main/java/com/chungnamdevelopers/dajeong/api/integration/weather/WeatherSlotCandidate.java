package com.chungnamdevelopers.dajeong.api.integration.weather;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

record WeatherSlotCandidate(
        UUID slotId,
        UUID versionId,
        UUID tripId,
        Instant startsAt,
        Instant endsAt,
        String placeName,
        BigDecimal latitude,
        BigDecimal longitude
) {
    WeatherLocation location() {
        return new WeatherLocation(latitude, longitude);
    }
}
