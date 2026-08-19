package com.chungnamdevelopers.dajeong.api;

import com.chungnamdevelopers.dajeong.api.integration.weather.WeatherForecast;
import com.chungnamdevelopers.dajeong.api.integration.weather.WeatherForecastClient;
import com.chungnamdevelopers.dajeong.api.integration.weather.WeatherForecastException;
import com.chungnamdevelopers.dajeong.api.integration.weather.WeatherLocation;
import com.chungnamdevelopers.dajeong.api.integration.weather.WeatherPollResult;
import com.chungnamdevelopers.dajeong.api.integration.weather.WeatherPollService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Testcontainers
@Import(WeatherPollIntegrationTests.WeatherClientConfiguration.class)
class WeatherPollIntegrationTests {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:16.15-alpine3.24");

    @Autowired
    private MutableWeatherForecastClient forecastClient;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WeatherPollService weatherPollService;

    @Test
    void sixtyPercentCreatesOneWeatherDisruptionPerForecastIssue() throws Exception {
        String host = "weather-threshold-host";
        String tripId = createdTripId(host, "날씨 경계 여행", "2026-09-01", "2026-09-03");
        addSlot(
                tripId,
                host,
                0,
                "한밭수목원",
                "2026-09-01",
                "10:00",
                "11:30",
                false
        );
        String slotId = publish(tripId, host, 1);
        activate(tripId);

        Instant now = Instant.parse("2026-09-01T00:00:00Z");
        Instant forecastAt = Instant.parse("2026-09-01T01:00:00Z");
        Instant firstIssue = Instant.parse("2026-08-31T23:00:00Z");
        forecastClient.respondWith(List.of(new WeatherForecast(
                67,
                100,
                forecastAt,
                firstIssue,
                59
        )));

        WeatherPollResult belowThreshold = weatherPollService.poll(now);
        assertThat(belowThreshold.candidateSlots()).isEqualTo(1);
        assertThat(belowThreshold.cachedForecasts()).isEqualTo(1);
        assertThat(belowThreshold.createdDisruptions()).isZero();
        assertThat(jdbcClient.sql("""
                        select
                            grid_x,
                            grid_y,
                            forecast_at,
                            issued_at,
                            precipitation_probability
                        from public.weather_forecast_cache
                        """)
                .query((resultSet, rowNumber) -> new CachedWeatherForecast(
                        resultSet.getInt("grid_x"),
                        resultSet.getInt("grid_y"),
                        resultSet.getObject("forecast_at", Timestamp.class).toInstant(),
                        resultSet.getObject("issued_at", Timestamp.class).toInstant(),
                        resultSet.getInt("precipitation_probability")
                ))
                .single()).isEqualTo(new CachedWeatherForecast(
                        67,
                        100,
                        forecastAt,
                        firstIssue,
                        59
                ));

        forecastClient.respondFromFixture("/fixtures/weather/normal.json");
        WeatherPollResult threshold = weatherPollService.poll(now);
        assertThat(threshold.createdDisruptions()).isEqualTo(1);
        assertThat(weatherPollService.poll(now).createdDisruptions()).isZero();

        mockMvc.perform(get("/api/v1/trips/{tripId}/disruptions", tripId)
                        .with(user(host)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disruptions.length()").value(1))
                .andExpect(jsonPath("$.disruptions[0].itinerarySlotId").value(slotId))
                .andExpect(jsonPath("$.disruptions[0].type").value("WEATHER"))
                .andExpect(jsonPath("$.disruptions[0].reporterDisplayName")
                        .value("기상청 단기예보"))
                .andExpect(jsonPath("$.disruptions[0].reportedByUserId").doesNotExist())
                .andExpect(jsonPath("$.disruptions[0].weatherGridX").value(67))
                .andExpect(jsonPath("$.disruptions[0].weatherGridY").value(100))
                .andExpect(jsonPath("$.disruptions[0].precipitationProbability").value(60))
                .andExpect(jsonPath("$.disruptions[0].forecastAt").value(forecastAt.toString()))
                .andExpect(jsonPath("$.disruptions[0].forecastIssuedAt")
                        .value(firstIssue.toString()));

        UUID firstDisruptionId = jdbcClient.sql("""
                        select id
                        from public.disruption
                        where trip_id = cast(:tripId as uuid)
                          and forecast_issued_at = :issuedAt
                        """)
                .param("tripId", tripId)
                .param("issuedAt", Timestamp.from(firstIssue))
                .query(UUID.class)
                .single();
        mockMvc.perform(post(
                                "/api/v1/disruptions/{disruptionId}/replans",
                                firstDisruptionId
                        )
                        .with(user(host))
                        .header("Idempotency-Key", "weather-replan-" + tripId))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.disruptionStatus").value("ACKNOWLEDGED"))
                .andExpect(jsonPath("$.proposalSet.status").value("QUEUED"));

        Instant secondIssue = Instant.parse("2026-09-01T00:30:00Z");
        forecastClient.respondWith(List.of(new WeatherForecast(
                67,
                100,
                forecastAt,
                secondIssue,
                80
        )));
        assertThat(weatherPollService.poll(now).createdDisruptions()).isEqualTo(1);
        assertThat(jdbcClient.sql("""
                        select count(*)
                        from public.disruption
                        where trip_id = cast(:tripId as uuid)
                          and type = 'WEATHER'
                        """)
                .param("tripId", tripId)
                .query(Integer.class)
                .single()).isEqualTo(2);
    }

    @Test
    void pollFiltersIndoorAndOutsideWindowSlotsAndKeepsFailuresSafe()
            throws Exception {
        String host = "weather-filter-host";
        String tripId = createdTripId(
                host,
                "날씨 필터 여행",
                "2026-10-01",
                "2026-10-03"
        );
        addSlot(
                tripId,
                host,
                0,
                "대전 야외광장",
                "2026-10-01",
                "10:00",
                "11:00",
                false
        );
        addSlot(
                tripId,
                host,
                1,
                "대전 실내전시관",
                "2026-10-01",
                "12:00",
                "13:00",
                true
        );
        addSlot(
                tripId,
                host,
                2,
                "내일 야외광장",
                "2026-10-02",
                "10:00",
                "11:00",
                false
        );
        addSlot(
                tripId,
                host,
                3,
                "지난 야외광장",
                "2026-10-01",
                "08:00",
                "08:30",
                false
        );
        publish(tripId, host, 4);
        addSlot(
                tripId,
                host,
                4,
                "최신 버전 야외광장",
                "2026-10-01",
                "14:00",
                "15:00",
                false
        );
        publish(tripId, host, 5);
        activate(tripId);

        Instant now = Instant.parse("2026-10-01T00:00:00Z");
        forecastClient.respondFromFixture("/fixtures/weather/error.json");
        WeatherPollResult failed = weatherPollService.poll(now);
        assertThat(failed.candidateSlots()).isEqualTo(2);
        assertThat(failed.failedLocations()).isEqualTo(1);
        assertThat(failed.createdDisruptions()).isZero();

        forecastClient.respondFromFixture("/fixtures/weather/empty.json");
        WeatherPollResult empty = weatherPollService.poll(now);
        assertThat(empty.fetchedLocations()).isEqualTo(1);
        assertThat(empty.cachedForecasts()).isZero();
        assertThat(empty.createdDisruptions()).isZero();
        assertThat(jdbcClient.sql("""
                        select count(*)
                        from public.disruption
                        where trip_id = cast(:tripId as uuid)
                        """)
                .param("tripId", tripId)
                .query(Integer.class)
                .single()).isZero();
    }

    private String addSlot(
            String tripId,
            String host,
            long revision,
            String placeName,
            String date,
            String startsAt,
            String endsAt,
            boolean indoor
    ) throws Exception {
        MvcResult result = mockMvc.perform(post(
                                "/api/v1/trips/{tripId}/itineraries/draft/slots",
                                tripId
                        )
                        .with(user(host))
                        .header("If-Match", revision)
                        .header("Idempotency-Key", "weather-slot-" + tripId + "-" + revision)
                        .contentType("application/json")
                        .content(slotJson(placeName, date, startsAt, endsAt, indoor)))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(
                result.getResponse().getContentAsString(),
                "$.slots[" + revision + "].id"
        );
    }

    private String publish(String tripId, String host, long revision) throws Exception {
        MvcResult result = mockMvc.perform(post(
                                "/api/v1/trips/{tripId}/itineraries/draft/publish",
                                tripId
                        )
                        .with(user(host))
                        .header("If-Match", revision)
                        .header(
                                "Idempotency-Key",
                                "weather-publish-" + tripId + "-" + revision
                        ))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.slots[0].id");
    }

    private void activate(String tripId) {
        jdbcClient.sql("""
                        update public.trip
                        set status = 'ACTIVE'
                        where id = cast(:tripId as uuid)
                        """)
                .param("tripId", tripId)
                .update();
    }

    private String createdTripId(
            String subject,
            String title,
            String startDate,
            String endDate
    ) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/trips")
                        .with(user(subject))
                        .header("Idempotency-Key", "create-" + subject)
                        .contentType("application/json")
                        .content("""
                                {
                                  "title": "%s",
                                  "startDate": "%s",
                                  "endDate": "%s"
                                }
                                """.formatted(title, startDate, endDate)))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }

    private String slotJson(
            String placeName,
            String date,
            String startsAt,
            String endsAt,
            boolean indoor
    ) {
        return """
                {
                  "startsAt": "%sT%s:00+09:00",
                  "endsAt": "%sT%s:00+09:00",
                  "placeName": "%s",
                  "address": "대전광역시 유성구 대학로 1",
                  "latitude": 36.350000,
                  "longitude": 127.380000,
                  "indoor": %s,
                  "category": "CULTURE",
                  "expectedCost": 3000
                }
                """.formatted(date, startsAt, date, endsAt, placeName, indoor);
    }

    private JwtRequestPostProcessor user(String subject) {
        return jwt().jwt(token -> token.subject(subject).claim("name", subject));
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class WeatherClientConfiguration {

        @Bean
        MutableWeatherForecastClient weatherForecastClient() {
            return new MutableWeatherForecastClient();
        }
    }

    static class MutableWeatherForecastClient implements WeatherForecastClient {

        private List<WeatherForecast> forecasts = List.of();
        private String failureMessage;

        @Override
        public List<WeatherForecast> fetch(
                WeatherLocation location,
                Instant windowStart,
                Instant windowEnd
        ) {
            if (failureMessage != null) {
                throw new WeatherForecastException(failureMessage);
            }
            return forecasts;
        }

        void respondWith(List<WeatherForecast> nextForecasts) {
            forecasts = List.copyOf(nextForecasts);
            failureMessage = null;
        }

        void failWith(String message) {
            failureMessage = message;
            forecasts = List.of();
        }

        void respondFromFixture(String resourcePath) throws IOException {
            String payload;
            try (InputStream input = getClass().getResourceAsStream(resourcePath)) {
                if (input == null) {
                    throw new IOException("날씨 fixture를 찾을 수 없습니다: " + resourcePath);
                }
                payload = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            }
            String status = JsonPath.read(payload, "$.status");
            if ("ERROR".equals(status)) {
                failWith(JsonPath.read(payload, "$.message"));
                return;
            }
            List<Map<String, Object>> rows = JsonPath.read(payload, "$.forecasts");
            respondWith(rows.stream()
                    .map(row -> new WeatherForecast(
                            ((Number) row.get("gridX")).intValue(),
                            ((Number) row.get("gridY")).intValue(),
                            Instant.parse((String) row.get("forecastAt")),
                            Instant.parse((String) row.get("issuedAt")),
                            ((Number) row.get("precipitationProbability")).intValue()
                    ))
                    .toList());
        }
    }

    private record CachedWeatherForecast(
            int gridX,
            int gridY,
            Instant forecastAt,
            Instant issuedAt,
            int precipitationProbability
    ) {
    }
}
