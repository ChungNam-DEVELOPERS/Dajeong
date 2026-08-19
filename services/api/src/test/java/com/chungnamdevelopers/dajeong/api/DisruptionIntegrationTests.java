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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Testcontainers
class DisruptionIntegrationTests {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:16.15-alpine3.24");

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unauthenticatedDisruptionRequestsAreRejected() throws Exception {
        UUID tripId = UUID.randomUUID();
        UUID disruptionId = UUID.randomUUID();

        mockMvc.perform(get("/api/v1/trips/{tripId}/disruptions", tripId))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/trips/{tripId}/disruptions", tripId)
                        .header("Idempotency-Key", "anonymous-report")
                        .contentType("application/json")
                        .content(disruptionJson(UUID.randomUUID().toString(), "OTHER", "문제")))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/disruptions/{id}/dismiss", disruptionId)
                        .header("Idempotency-Key", "anonymous-dismiss"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void membersReportCurrentSlotsAndGroupSeesTheSharedStatus() throws Exception {
        String host = "disruption-host";
        String member = "disruption-member";
        String tripId = createdTripId(host, "문제 신고 여행");
        joinTrip(tripId, host, member);
        String slotId = publishSlot(tripId, host, "한밭수목원");

        MvcResult created = mockMvc.perform(post(
                                "/api/v1/trips/{tripId}/disruptions",
                                tripId
                        )
                        .with(user(member, "여행 멤버"))
                        .header("Idempotency-Key", "report-closure-1")
                        .contentType("application/json")
                        .content(disruptionJson(slotId, "CLOSURE", "  임시 휴관 안내를 확인했어요.  ")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.itinerarySlotId").value(slotId))
                .andExpect(jsonPath("$.itineraryVersionNumber").value(1))
                .andExpect(jsonPath("$.placeName").value("한밭수목원"))
                .andExpect(jsonPath("$.type").value("CLOSURE"))
                .andExpect(jsonPath("$.description").value("임시 휴관 안내를 확인했어요."))
                .andExpect(jsonPath("$.reporterDisplayName").value("여행 멤버"))
                .andExpect(jsonPath("$.status").value("DETECTED"))
                .andReturn();
        String disruptionId = JsonPath.read(
                created.getResponse().getContentAsString(),
                "$.id"
        );

        mockMvc.perform(post("/api/v1/trips/{tripId}/disruptions", tripId)
                        .with(user(member, "여행 멤버"))
                        .header("Idempotency-Key", "report-closure-1")
                        .contentType("application/json")
                        .content(disruptionJson(slotId, "CLOSURE", "임시 휴관 안내를 확인했어요.")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(disruptionId));

        mockMvc.perform(post("/api/v1/trips/{tripId}/disruptions", tripId)
                        .with(user(member, "여행 멤버"))
                        .header("Idempotency-Key", "report-closure-1")
                        .contentType("application/json")
                        .content(disruptionJson(slotId, "TRAFFIC", "다른 요청")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));

        mockMvc.perform(get("/api/v1/trips/{tripId}/disruptions", tripId)
                        .with(user(host, "여행 방장")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tripId").value(tripId))
                .andExpect(jsonPath("$.disruptions.length()").value(1))
                .andExpect(jsonPath("$.disruptions[0].id").value(disruptionId));

        mockMvc.perform(get("/api/v1/trips/{tripId}/disruptions", tripId)
                        .with(user("disruption-outsider", "외부 사용자")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("DISRUPTION_FORBIDDEN"));

        mockMvc.perform(post("/api/v1/trips/{tripId}/disruptions", tripId)
                        .with(user(host, "여행 방장"))
                        .header("Idempotency-Key", "missing-slot")
                        .contentType("application/json")
                        .content(disruptionJson(UUID.randomUUID().toString(), "OTHER", "슬롯 없음")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("DISRUPTION_SLOT_NOT_FOUND"));

        assertThat(jdbcClient.sql("select count(*) from public.disruption")
                .query(Integer.class)
                .single()).isEqualTo(1);
    }

    @Test
    void membersChooseKeepOrStartReplanWithoutChangingTheItinerary() throws Exception {
        String host = "disruption-action-host";
        String member = "disruption-action-member";
        String tripId = createdTripId(host, "문제 처리 여행");
        joinTrip(tripId, host, member);
        String slotId = publishSlot(tripId, host, "대전시립미술관");
        String dismissedId = createDisruption(
                tripId,
                member,
                slotId,
                "TRAFFIC",
                "버스 운행이 지연되고 있어요.",
                "traffic-report"
        );

        mockMvc.perform(post("/api/v1/disruptions/{id}/dismiss", dismissedId)
                        .with(user(host, "방장"))
                        .header("Idempotency-Key", "keep-original"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISMISSED"));
        mockMvc.perform(post("/api/v1/disruptions/{id}/dismiss", dismissedId)
                        .with(user(host, "방장"))
                        .header("Idempotency-Key", "keep-original"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISMISSED"));
        mockMvc.perform(post("/api/v1/disruptions/{id}/replans", dismissedId)
                        .with(user(member, "멤버"))
                        .header("Idempotency-Key", "change-decision"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DISRUPTION_ALREADY_RESOLVED"));

        String acknowledgedId = createDisruption(
                tripId,
                host,
                slotId,
                "OTHER",
                "현장 이용이 어렵습니다.",
                "other-report"
        );
        mockMvc.perform(post("/api/v1/disruptions/{id}/replans", acknowledgedId)
                        .with(user(member, "멤버"))
                        .header("Idempotency-Key", "start-replan"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.disruptionStatus").value("ACKNOWLEDGED"))
                .andExpect(jsonPath("$.proposalSet.status").value("QUEUED"));

        mockMvc.perform(get("/api/v1/trips/{tripId}/itineraries/current", tripId)
                        .with(user(member, "멤버")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.versionNumber").value(1))
                .andExpect(jsonPath("$.slots[0].id").value(slotId));

        jdbcClient.sql("""
                        update public.trip
                        set status = 'COMPLETED'
                        where id = cast(:tripId as uuid)
                        """)
                .param("tripId", tripId)
                .update();
        mockMvc.perform(post("/api/v1/trips/{tripId}/disruptions", tripId)
                        .with(user(host, "방장"))
                        .header("Idempotency-Key", "completed-report")
                        .contentType("application/json")
                        .content(disruptionJson(slotId, "OTHER", "완료 여행")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DISRUPTION_NOT_EDITABLE"));
    }

    private String createDisruption(
            String tripId,
            String subject,
            String slotId,
            String type,
            String description,
            String idempotencyKey
    ) throws Exception {
        MvcResult result = mockMvc.perform(post(
                                "/api/v1/trips/{tripId}/disruptions",
                                tripId
                        )
                        .with(user(subject, subject))
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType("application/json")
                        .content(disruptionJson(slotId, type, description)))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }

    private String publishSlot(String tripId, String host, String placeName) throws Exception {
        mockMvc.perform(post("/api/v1/trips/{tripId}/itineraries/draft/slots", tripId)
                        .with(user(host, "방장"))
                        .header("If-Match", "0")
                        .header("Idempotency-Key", "slot-" + tripId)
                        .contentType("application/json")
                        .content(slotJson(placeName)))
                .andExpect(status().isCreated());
        MvcResult published = mockMvc.perform(post(
                                "/api/v1/trips/{tripId}/itineraries/draft/publish",
                                tripId
                        )
                        .with(user(host, "방장"))
                        .header("If-Match", "1")
                        .header("Idempotency-Key", "publish-" + tripId))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(published.getResponse().getContentAsString(), "$.slots[0].id");
    }

    private void joinTrip(String tripId, String host, String member) throws Exception {
        MvcResult invitation = mockMvc.perform(post(
                                "/api/v1/trips/{tripId}/invites",
                                tripId
                        )
                        .with(user(host, "방장")))
                .andExpect(status().isCreated())
                .andReturn();
        String code = JsonPath.read(invitation.getResponse().getContentAsString(), "$.code");
        mockMvc.perform(post("/api/v1/invites/{code}/join", code)
                        .with(user(member, "여행 멤버")))
                .andExpect(status().isCreated());
    }

    private String createdTripId(String subject, String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/trips")
                        .with(user(subject, "여행 방장"))
                        .header("Idempotency-Key", "create-" + subject)
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

    private String disruptionJson(String slotId, String type, String description) {
        return """
                {
                  "itinerarySlotId": "%s",
                  "type": "%s",
                  "description": "%s"
                }
                """.formatted(slotId, type, description);
    }

    private String slotJson(String placeName) {
        return """
                {
                  "startsAt": "2026-09-01T10:00:00+09:00",
                  "endsAt": "2026-09-01T11:30:00+09:00",
                  "placeName": "%s",
                  "address": "대전광역시 유성구 대학로 1",
                  "latitude": 36.350000,
                  "longitude": 127.380000,
                  "indoor": false,
                  "category": "CULTURE",
                  "expectedCost": 3000
                }
                """.formatted(placeName);
    }

    private JwtRequestPostProcessor user(String subject, String name) {
        return jwt().jwt(token -> token.subject(subject).claim("name", name));
    }
}
