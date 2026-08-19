package com.chungnamdevelopers.dajeong.api;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

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
class TripIntegrationTests {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:16.15-alpine3.24");

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unauthenticatedTripRequestsAreRejected() throws Exception {
        mockMvc.perform(get("/api/v1/trips"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/trips")
                        .header("Idempotency-Key", "anonymous-create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tripRequest("로그인 없는 여행", "2026-08-21", "2026-08-23")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void creationStoresOneHostMembershipAndReusesTheIdempotentResult() throws Exception {
        String request = tripRequest("  대전 여름 여행  ", "2026-08-21", "2026-08-23");

        MvcResult first = mockMvc.perform(post("/api/v1/trips")
                        .with(user("trip-host-1", "여행 방장"))
                        .header("Idempotency-Key", "trip-create-once")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("대전 여름 여행"))
                .andExpect(jsonPath("$.region").value("DAEJEON"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.role").value("HOST"))
                .andReturn();

        String tripId = JsonPath.read(first.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(post("/api/v1/trips")
                        .with(user("trip-host-1", "바뀐 표시 이름"))
                        .header("Idempotency-Key", "trip-create-once")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(tripId));

        mockMvc.perform(post("/api/v1/trips")
                        .with(user("trip-host-1", "여행 방장"))
                        .header("Idempotency-Key", "trip-create-once")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tripRequest("다른 여행", "2026-08-21", "2026-08-23")))
                .andExpect(status().isConflict());

        assertThat(jdbcClient.sql("select count(*) from public.trip")
                .query(Integer.class)
                .single()).isEqualTo(1);
        assertThat(jdbcClient.sql("""
                        select count(*)
                        from public.trip_membership
                        where trip_id = cast(:tripId as uuid)
                          and role = 'HOST'
                          and status = 'ACTIVE'
                        """)
                .param("tripId", tripId)
                .query(Integer.class)
                .single()).isEqualTo(1);

        String storedKeyHash = jdbcClient.sql("""
                        select creation_request_key_hash
                        from public.trip
                        where id = cast(:tripId as uuid)
                        """)
                .param("tripId", tripId)
                .query(String.class)
                .single();
        assertThat(storedKeyHash)
                .hasSize(64)
                .isNotEqualTo("trip-create-once");
    }

    @Test
    void invalidDateRangeDoesNotCreateATrip() throws Exception {
        mockMvc.perform(post("/api/v1/trips")
                        .with(user("invalid-date-host", "날짜 검사"))
                        .header("Idempotency-Key", "invalid-date")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tripRequest("시간을 거스르는 여행", "2026-08-23", "2026-08-21")))
                .andExpect(status().isBadRequest());

        assertThat(jdbcClient.sql("""
                        select count(*)
                        from public.trip t
                        join public.app_user u on u.id = t.host_user_id
                        where u.cognito_subject = 'invalid-date-host'
                        """)
                .query(Integer.class)
                .single()).isZero();
    }

    @Test
    void listIsIsolatedByMembershipAndSupportsCursorPagination() throws Exception {
        String firstTripId = createdTripId(
                "list-host-a",
                "list-a-first",
                "첫 번째 여행"
        );
        String secondTripId = createdTripId(
                "list-host-a",
                "list-a-second",
                "두 번째 여행"
        );
        String otherTripId = createdTripId(
                "list-host-b",
                "list-b-only",
                "다른 사용자의 여행"
        );

        jdbcClient.sql("""
                        update public.trip
                        set created_at = case
                            when id = cast(:firstTripId as uuid) then timestamptz '2026-08-19 01:00:00+00'
                            when id = cast(:secondTripId as uuid) then timestamptz '2026-08-19 02:00:00+00'
                            else created_at
                        end
                        where id in (cast(:firstTripId as uuid), cast(:secondTripId as uuid))
                        """)
                .param("firstTripId", firstTripId)
                .param("secondTripId", secondTripId)
                .update();

        MvcResult firstPage = mockMvc.perform(get("/api/v1/trips")
                        .with(user("list-host-a", "목록 A"))
                        .queryParam("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].id").value(secondTripId))
                .andExpect(jsonPath("$.nextCursor").isNotEmpty())
                .andReturn();

        String cursor = JsonPath.read(
                firstPage.getResponse().getContentAsString(),
                "$.nextCursor"
        );
        mockMvc.perform(get("/api/v1/trips")
                        .with(user("list-host-a", "목록 A"))
                        .queryParam("limit", "1")
                        .queryParam("cursor", cursor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].id").value(firstTripId))
                .andExpect(jsonPath("$.nextCursor").doesNotExist());

        mockMvc.perform(get("/api/v1/trips")
                        .with(user("list-host-b", "목록 B")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].id").value(otherTripId));

        mockMvc.perform(get("/api/v1/trips")
                        .with(user("list-host-a", "목록 A"))
                        .queryParam("cursor", "not-a-valid-cursor"))
                .andExpect(status().isBadRequest());
    }

    private String createdTripId(
            String subject,
            String idempotencyKey,
            String title
    ) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/trips")
                        .with(user(subject, subject))
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tripRequest(title, "2026-09-01", "2026-09-03")))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }

    private JwtRequestPostProcessor user(String subject, String name) {
        return jwt().jwt(token -> token
                .subject(subject)
                .claim("name", name));
    }

    private String tripRequest(String title, String startDate, String endDate) {
        return """
                {
                  "title": "%s",
                  "startDate": "%s",
                  "endDate": "%s"
                }
                """.formatted(title, startDate, endDate);
    }
}
