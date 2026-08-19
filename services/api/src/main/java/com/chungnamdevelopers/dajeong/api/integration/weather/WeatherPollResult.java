package com.chungnamdevelopers.dajeong.api.integration.weather;

public record WeatherPollResult(
        int candidateSlots,
        int fetchedLocations,
        int cachedForecasts,
        int createdDisruptions,
        int failedLocations
) {
}
