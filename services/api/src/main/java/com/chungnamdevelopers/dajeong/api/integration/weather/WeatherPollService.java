package com.chungnamdevelopers.dajeong.api.integration.weather;

import com.chungnamdevelopers.dajeong.api.error.ApiException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class WeatherPollService {

    private static final Duration DETECTION_WINDOW = Duration.ofHours(24);

    private final ObjectProvider<JdbcClient> jdbcClientProvider;
    private final ObjectProvider<WeatherForecastClient> forecastClientProvider;
    private final WeatherPollPersistence persistence;

    public WeatherPollService(
            ObjectProvider<JdbcClient> jdbcClientProvider,
            ObjectProvider<WeatherForecastClient> forecastClientProvider,
            WeatherPollPersistence persistence
    ) {
        this.jdbcClientProvider = jdbcClientProvider;
        this.forecastClientProvider = forecastClientProvider;
        this.persistence = persistence;
    }

    public WeatherPollResult poll(Instant now) {
        JdbcClient jdbcClient = requireJdbcClient();
        Instant windowEnd = now.plus(DETECTION_WINDOW);
        List<WeatherSlotCandidate> candidates = loadCandidates(
                jdbcClient,
                now,
                windowEnd
        );
        Map<WeatherLocation, List<WeatherSlotCandidate>> byLocation = new LinkedHashMap<>();
        for (WeatherSlotCandidate candidate : candidates) {
            byLocation.computeIfAbsent(candidate.location(), ignored -> new ArrayList<>())
                    .add(candidate);
        }

        WeatherForecastClient client = forecastClientProvider.getIfAvailable();
        if (client == null) {
            return new WeatherPollResult(
                    candidates.size(),
                    0,
                    0,
                    0,
                    byLocation.size()
            );
        }

        int fetchedLocations = 0;
        int cachedForecasts = 0;
        int createdDisruptions = 0;
        int failedLocations = 0;
        for (Map.Entry<WeatherLocation, List<WeatherSlotCandidate>> entry
                : byLocation.entrySet()) {
            try {
                List<WeatherForecast> forecasts = client.fetch(
                                entry.getKey(),
                                now,
                                windowEnd
                        ).stream()
                        .filter(forecast -> !forecast.forecastAt().isBefore(now))
                        .filter(forecast -> forecast.forecastAt().isBefore(windowEnd))
                        .toList();
                fetchedLocations++;
                WeatherDetectionResult result = persistence.storeAndDetect(
                        entry.getKey(),
                        forecasts,
                        entry.getValue()
                );
                cachedForecasts += result.cachedForecasts();
                createdDisruptions += result.createdDisruptions();
            } catch (WeatherForecastException exception) {
                failedLocations++;
            }
        }
        return new WeatherPollResult(
                candidates.size(),
                fetchedLocations,
                cachedForecasts,
                createdDisruptions,
                failedLocations
        );
    }

    private List<WeatherSlotCandidate> loadCandidates(
            JdbcClient jdbcClient,
            Instant windowStart,
            Instant windowEnd
    ) {
        return jdbcClient.sql("""
                        select
                            s.id as slot_id,
                            v.id as version_id,
                            v.trip_id,
                            s.starts_at,
                            s.ends_at,
                            s.place_name,
                            s.latitude,
                            s.longitude
                        from public.itinerary_slot s
                        join public.itinerary_version v
                          on v.id = s.itinerary_version_id
                        join public.trip t
                          on t.id = v.trip_id
                        where t.status = 'ACTIVE'
                          and not s.indoor
                          and s.latitude is not null
                          and s.longitude is not null
                          and s.starts_at < :windowEnd
                          and s.ends_at > :windowStart
                          and v.version_number = (
                              select max(current.version_number)
                              from public.itinerary_version current
                              where current.trip_id = v.trip_id
                          )
                        order by s.starts_at, s.id
                        """)
                .param("windowStart", Timestamp.from(windowStart))
                .param("windowEnd", Timestamp.from(windowEnd))
                .query((resultSet, rowNumber) -> new WeatherSlotCandidate(
                        resultSet.getObject("slot_id", java.util.UUID.class),
                        resultSet.getObject("version_id", java.util.UUID.class),
                        resultSet.getObject("trip_id", java.util.UUID.class),
                        resultSet.getObject("starts_at", Timestamp.class).toInstant(),
                        resultSet.getObject("ends_at", Timestamp.class).toInstant(),
                        resultSet.getString("place_name"),
                        resultSet.getBigDecimal("latitude"),
                        resultSet.getBigDecimal("longitude")
                ))
                .list();
    }

    private JdbcClient requireJdbcClient() {
        JdbcClient jdbcClient = jdbcClientProvider.getIfAvailable();
        if (jdbcClient == null) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "WEATHER_STORE_UNAVAILABLE",
                    "날씨 감지 저장소가 구성되지 않았습니다."
            );
        }
        return jdbcClient;
    }
}
