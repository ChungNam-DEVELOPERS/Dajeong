package com.chungnamdevelopers.dajeong.api.integration.weather;

import java.time.Instant;
import java.util.Objects;

public record WeatherForecast(
        int gridX,
        int gridY,
        Instant forecastAt,
        Instant issuedAt,
        int precipitationProbability
) {
    public WeatherForecast {
        Objects.requireNonNull(forecastAt, "forecastAt");
        Objects.requireNonNull(issuedAt, "issuedAt");
        if (precipitationProbability < 0 || precipitationProbability > 100) {
            throw new IllegalArgumentException("강수확률은 0에서 100 사이여야 합니다.");
        }
    }
}
