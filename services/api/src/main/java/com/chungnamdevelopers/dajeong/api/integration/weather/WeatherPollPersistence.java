package com.chungnamdevelopers.dajeong.api.integration.weather;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.BinaryOperator;
import java.util.stream.Collectors;

@Service
class WeatherPollPersistence {

    private final ObjectProvider<JdbcClient> jdbcClientProvider;

    WeatherPollPersistence(ObjectProvider<JdbcClient> jdbcClientProvider) {
        this.jdbcClientProvider = jdbcClientProvider;
    }

    @Transactional
    WeatherDetectionResult storeAndDetect(
            WeatherLocation location,
            List<WeatherForecast> forecasts,
            List<WeatherSlotCandidate> slots
    ) {
        JdbcClient jdbcClient = jdbcClientProvider.getObject();
        for (WeatherForecast forecast : forecasts) {
            cache(jdbcClient, location, forecast);
        }

        int created = 0;
        for (WeatherSlotCandidate slot : slots) {
            Map<java.time.Instant, WeatherForecast> strongestByIssue = forecasts.stream()
                    .filter(forecast -> forecast.precipitationProbability() >= 60)
                    .filter(forecast -> !forecast.forecastAt().isBefore(slot.startsAt()))
                    .filter(forecast -> forecast.forecastAt().isBefore(slot.endsAt()))
                    .collect(Collectors.toMap(
                            WeatherForecast::issuedAt,
                            forecast -> forecast,
                            BinaryOperator.maxBy(Comparator.comparingInt(
                                    WeatherForecast::precipitationProbability
                            ))
                    ));
            for (WeatherForecast forecast : strongestByIssue.values()) {
                created += insertWeatherDisruption(jdbcClient, slot, forecast);
            }
        }
        return new WeatherDetectionResult(forecasts.size(), created);
    }

    private void cache(
            JdbcClient jdbcClient,
            WeatherLocation location,
            WeatherForecast forecast
    ) {
        jdbcClient.sql("""
                        insert into public.weather_forecast_cache (
                            latitude,
                            longitude,
                            grid_x,
                            grid_y,
                            forecast_at,
                            issued_at,
                            precipitation_probability
                        )
                        values (
                            :latitude,
                            :longitude,
                            :gridX,
                            :gridY,
                            :forecastAt,
                            :issuedAt,
                            :probability
                        )
                        on conflict (latitude, longitude, forecast_at, issued_at) do update
                        set grid_x = excluded.grid_x,
                            grid_y = excluded.grid_y,
                            precipitation_probability = excluded.precipitation_probability,
                            fetched_at = current_timestamp
                        """)
                .param("latitude", location.latitude())
                .param("longitude", location.longitude())
                .param("gridX", forecast.gridX())
                .param("gridY", forecast.gridY())
                .param("forecastAt", Timestamp.from(forecast.forecastAt()))
                .param("issuedAt", Timestamp.from(forecast.issuedAt()))
                .param("probability", forecast.precipitationProbability())
                .update();
    }

    private int insertWeatherDisruption(
            JdbcClient jdbcClient,
            WeatherSlotCandidate slot,
            WeatherForecast forecast
    ) {
        String keyMaterial = slot.slotId() + "\n" + forecast.issuedAt();
        String payloadMaterial = keyMaterial + "\n" + forecast.forecastAt()
                + "\n" + forecast.precipitationProbability();
        return jdbcClient.sql("""
                        insert into public.disruption (
                            id,
                            trip_id,
                            itinerary_version_id,
                            itinerary_slot_id,
                            reported_by_user_id,
                            type,
                            description,
                            status,
                            creation_request_key_hash,
                            request_payload_hash,
                            weather_grid_x,
                            weather_grid_y,
                            precipitation_probability,
                            forecast_at,
                            forecast_issued_at
                        )
                        values (
                            :id,
                            :tripId,
                            :versionId,
                            :slotId,
                            null,
                            'WEATHER',
                            :description,
                            'DETECTED',
                            :requestKeyHash,
                            :payloadHash,
                            :gridX,
                            :gridY,
                            :probability,
                            :forecastAt,
                            :issuedAt
                        )
                        on conflict (itinerary_slot_id, forecast_issued_at)
                            where type = 'WEATHER'
                            do nothing
                        """)
                .param("id", UUID.randomUUID())
                .param("tripId", slot.tripId())
                .param("versionId", slot.versionId())
                .param("slotId", slot.slotId())
                .param("description", "강수확률 %d%% 예보가 있어요."
                        .formatted(forecast.precipitationProbability()))
                .param("requestKeyHash", sha256(keyMaterial))
                .param("payloadHash", sha256(payloadMaterial))
                .param("gridX", forecast.gridX())
                .param("gridY", forecast.gridY())
                .param("probability", forecast.precipitationProbability())
                .param("forecastAt", Timestamp.from(forecast.forecastAt()))
                .param("issuedAt", Timestamp.from(forecast.issuedAt()))
                .update();
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }
}
