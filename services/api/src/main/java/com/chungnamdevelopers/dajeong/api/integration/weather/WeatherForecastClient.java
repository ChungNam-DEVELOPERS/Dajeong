package com.chungnamdevelopers.dajeong.api.integration.weather;

import java.time.Instant;
import java.util.List;

public interface WeatherForecastClient {

    List<WeatherForecast> fetch(
            WeatherLocation location,
            Instant windowStart,
            Instant windowEnd
    );
}
