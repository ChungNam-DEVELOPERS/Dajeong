package com.chungnamdevelopers.dajeong.api;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Testcontainers
class ItineraryIntegrationTests {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:16.15-alpine3.24");

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unauthenticatedItineraryRequestsAreRejected() throws Exception {
        UUID tripId = UUID.randomUUID();

        mockMvc.perform(get("/api/v1/trips/{tripId}/itineraries/current", tripId))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/trips/{tripId}/itineraries/draft/slots", tripId)
                        .header("If-Match", "0")
                        .header("Idempotency-Key", "anonymous-slot")
                        .contentType("application/json")
                        .content(slotJson("익명 장소", "10:00", "11:00")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void hostEditsDraftWithIdempotencyOverlapAndRevisionProtection() throws Exception {
        String host = "itinerary-edit-host";
        String tripId = createdTripId(host, "itinerary-edit-trip", "일정 편집 여행");

        mockMvc.perform(get("/api/v1/trips/{tripId}", tripId).with(user(host)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("HOST"));

        mockMvc.perform(get("/api/v1/trips/{tripId}/itineraries/draft", tripId)
                        .with(user(host)))
                .andExpect(status().isOk())
                .andExpect(header().string("ETag", "\"0\""))
                .andExpect(jsonPath("$.revision").value(0))
                .andExpect(jsonPath("$.slots").isEmpty());

        MvcResult created = mockMvc.perform(post(
                                "/api/v1/trips/{tripId}/itineraries/draft/slots",
                                tripId
                        )
                        .with(user(host))
                        .header("If-Match", "\"0\"")
                        .header("Idempotency-Key", "edit-slot-1")
                        .contentType("application/json")
                        .content(slotJson("국립중앙과학관", "10:00", "11:30")))
                .andExpect(status().isCreated())
                .andExpect(header().string("ETag", "\"1\""))
                .andExpect(jsonPath("$.revision").value(1))
                .andExpect(jsonPath("$.slots[0].placeName").value("국립중앙과학관"))
                .andReturn();
        String slotId = JsonPath.read(
                created.getResponse().getContentAsString(),
                "$.slots[0].id"
        );

        mockMvc.perform(post("/api/v1/trips/{tripId}/itineraries/draft/slots", tripId)
                        .with(user(host))
                        .header("If-Match", "0")
                        .header("Idempotency-Key", "edit-slot-1")
                        .contentType("application/json")
                        .content(slotJson("국립중앙과학관", "10:00", "11:30")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revision").value(1))
                .andExpect(jsonPath("$.slots.length()").value(1));

        mockMvc.perform(post("/api/v1/trips/{tripId}/itineraries/draft/slots", tripId)
                        .with(user(host))
                        .header("If-Match", "0")
                        .header("Idempotency-Key", "edit-slot-1")
                        .contentType("application/json")
                        .content(slotJson("다른 장소", "10:00", "11:30")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));

        mockMvc.perform(post("/api/v1/trips/{tripId}/itineraries/draft/slots", tripId)
                        .with(user(host))
                        .header("If-Match", "1")
                        .header("Idempotency-Key", "overlapping-slot")
                        .contentType("application/json")
                        .content(slotJson("겹치는 장소", "11:00", "12:00")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ITINERARY_SLOT"));

        mockMvc.perform(patch(
                                "/api/v1/trips/{tripId}/itineraries/draft/slots/{slotId}",
                                tripId,
                                slotId
                        )
                        .with(user(host))
                        .header("If-Match", "0")
                        .contentType("application/json")
                        .content(slotJson("수정 장소", "12:00", "13:00")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("STALE_VERSION"));

        mockMvc.perform(patch(
                                "/api/v1/trips/{tripId}/itineraries/draft/slots/{slotId}",
                                tripId,
                                slotId
                        )
                        .with(user(host))
                        .header("If-Match", "1")
                        .contentType("application/json")
                        .content(slotJson("한밭수목원", "12:00", "13:00")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revision").value(2))
                .andExpect(jsonPath("$.slots[0].placeName").value("한밭수목원"));

        mockMvc.perform(delete(
                                "/api/v1/trips/{tripId}/itineraries/draft/slots/{slotId}",
                                tripId,
                                slotId
                        )
                        .with(user(host))
                        .header("If-Match", "1"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("STALE_VERSION"));

        mockMvc.perform(delete(
                                "/api/v1/trips/{tripId}/itineraries/draft/slots/{slotId}",
                                tripId,
                                slotId
                        )
                        .with(user(host))
                        .header("If-Match", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revision").value(3))
                .andExpect(jsonPath("$.slots").isEmpty());

        mockMvc.perform(post("/api/v1/trips/{tripId}/itineraries/draft/slots", tripId)
                        .with(user(host))
                        .header("If-Match", "0")
                        .header("Idempotency-Key", "edit-slot-1")
                        .contentType("application/json")
                        .content(slotJson("국립중앙과학관", "10:00", "11:30")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revision").value(3))
                .andExpect(jsonPath("$.slots").isEmpty());
    }

    @Test
    void membersReadPublishedVersionsWhileOnlyHostCanMutate() throws Exception {
        String host = "itinerary-publish-host";
        String member = "itinerary-publish-member";
        String tripId = createdTripId(host, "itinerary-publish-trip", "일정 발행 여행");
        String slotId = addSlot(tripId, host, "publish-slot-1", "원본 장소");
        joinTrip(tripId, host, member);

        mockMvc.perform(get("/api/v1/trips/{tripId}", tripId).with(user(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("MEMBER"));
        mockMvc.perform(get("/api/v1/trips/{tripId}/itineraries/draft", tripId)
                        .with(user(member)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ITINERARY_FORBIDDEN"));
        mockMvc.perform(get("/api/v1/trips/{tripId}/itineraries/current", tripId)
                        .with(user(member)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ITINERARY_NOT_PUBLISHED"));

        mockMvc.perform(post("/api/v1/trips/{tripId}/itineraries/draft/publish", tripId)
                        .with(user(member))
                        .header("If-Match", "1")
                        .header("Idempotency-Key", "member-publish"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ITINERARY_FORBIDDEN"));

        mockMvc.perform(post("/api/v1/trips/{tripId}/itineraries/draft/publish", tripId)
                        .with(user(host))
                        .header("If-Match", "1")
                        .header("Idempotency-Key", "publish-version-1"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.versionNumber").value(1))
                .andExpect(jsonPath("$.previousVersionNumber").doesNotExist())
                .andExpect(jsonPath("$.slots[0].placeName").value("원본 장소"));

        mockMvc.perform(post("/api/v1/trips/{tripId}/itineraries/draft/publish", tripId)
                        .with(user(host))
                        .header("If-Match", "1")
                        .header("Idempotency-Key", "publish-version-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.versionNumber").value(1));

        mockMvc.perform(get("/api/v1/trips/{tripId}/itineraries/current", tripId)
                        .with(user(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.versionNumber").value(1))
                .andExpect(jsonPath("$.slots[0].placeName").value("원본 장소"));

        mockMvc.perform(patch(
                                "/api/v1/trips/{tripId}/itineraries/draft/slots/{slotId}",
                                tripId,
                                slotId
                        )
                        .with(user(host))
                        .header("If-Match", "1")
                        .contentType("application/json")
                        .content(slotJson("수정된 장소", "10:00", "11:00")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revision").value(2));

        mockMvc.perform(post("/api/v1/trips/{tripId}/itineraries/draft/publish", tripId)
                        .with(user(host))
                        .header("If-Match", "2")
                        .header("Idempotency-Key", "publish-version-2"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.versionNumber").value(2))
                .andExpect(jsonPath("$.previousVersionNumber").value(1))
                .andExpect(jsonPath("$.slots[0].placeName").value("수정된 장소"));

        mockMvc.perform(post("/api/v1/trips/{tripId}/itineraries/draft/publish", tripId)
                        .with(user(host))
                        .header("If-Match", "2")
                        .header("Idempotency-Key", "publish-unchanged"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ITINERARY_UNCHANGED"));

        mockMvc.perform(get("/api/v1/trips/{tripId}/itineraries/current", tripId)
                        .with(user(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.versionNumber").value(2))
                .andExpect(jsonPath("$.slots[0].placeName").value("수정된 장소"));

        assertThat(jdbcClient.sql("""
                        select s.place_name
                        from public.itinerary_slot s
                        join public.itinerary_version v
                          on v.id = s.itinerary_version_id
                        where v.trip_id = cast(:tripId as uuid)
                        order by v.version_number
                        """)
                .param("tripId", tripId)
                .query(String.class)
                .list()).containsExactly("원본 장소", "수정된 장소");
    }

    private String addSlot(
            String tripId,
            String host,
            String idempotencyKey,
            String placeName
    ) throws Exception {
        MvcResult result = mockMvc.perform(post(
                                "/api/v1/trips/{tripId}/itineraries/draft/slots",
                                tripId
                        )
                        .with(user(host))
                        .header("If-Match", "0")
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType("application/json")
                        .content(slotJson(placeName, "10:00", "11:00")))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.slots[0].id");
    }

    private void joinTrip(String tripId, String host, String member) throws Exception {
        MvcResult invitation = mockMvc.perform(post(
                                "/api/v1/trips/{tripId}/invites",
                                tripId
                        )
                        .with(user(host)))
                .andExpect(status().isCreated())
                .andReturn();
        String code = JsonPath.read(
                invitation.getResponse().getContentAsString(),
                "$.code"
        );
        mockMvc.perform(post("/api/v1/invites/{code}/join", code).with(user(member)))
                .andExpect(status().isCreated());
    }

    private String createdTripId(
            String subject,
            String idempotencyKey,
            String title
    ) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/trips")
                        .with(user(subject))
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType("application/json")
                        .content("""
                                {
                                  "title": "%s",
                                  "startDate": "2026-09-01",
                                  "endDate": "2026-09-03"
                                }
                                """.formatted(title)))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }

    private String slotJson(String placeName, String startsAt, String endsAt) {
        return """
                {
                  "startsAt": "2026-09-01T%s:00+09:00",
                  "endsAt": "2026-09-01T%s:00+09:00",
                  "placeName": "%s",
                  "address": "대전광역시 유성구 대학로 1",
                  "latitude": 36.350000,
                  "longitude": 127.380000,
                  "indoor": true,
                  "category": "CULTURE",
                  "expectedCost": 3000
                }
                """.formatted(startsAt, endsAt, placeName);
    }

    private JwtRequestPostProcessor user(String subject) {
        return jwt().jwt(token -> token
                .subject(subject)
                .claim("name", subject));
    }
}
