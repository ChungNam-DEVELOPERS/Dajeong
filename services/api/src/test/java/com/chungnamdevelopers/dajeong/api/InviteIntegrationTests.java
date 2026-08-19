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

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

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
class InviteIntegrationTests {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:16.15-alpine3.24");

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unauthenticatedInviteRequestsAreRejected() throws Exception {
        mockMvc.perform(post("/api/v1/trips/{tripId}/invites", UUID.randomUUID()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/invites/{code}/join", "anonymous-code"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void hostIssuesHashedSevenDayInviteAndReissueRevokesPreviousCode() throws Exception {
        String tripId = createdTripId("invite-host", "invite-trip", "초대할 여행");
        MvcResult firstIssue = issueInvite(tripId, "invite-host");
        String firstCode = JsonPath.read(firstIssue.getResponse().getContentAsString(), "$.code");
        String firstExpiry = JsonPath.read(firstIssue.getResponse().getContentAsString(), "$.expiresAt");

        assertThat(firstCode).hasSize(43);
        assertThat(Duration.between(Instant.now(), Instant.parse(firstExpiry)))
                .isBetween(Duration.ofDays(6), Duration.ofDays(8));

        String storedHash = jdbcClient.sql("""
                        select code_hash
                        from public.trip_invite
                        where trip_id = cast(:tripId as uuid)
                        """)
                .param("tripId", tripId)
                .query(String.class)
                .single();
        assertThat(storedHash)
                .hasSize(64)
                .isNotEqualTo(firstCode);

        MvcResult secondIssue = issueInvite(tripId, "invite-host");
        String secondCode = JsonPath.read(secondIssue.getResponse().getContentAsString(), "$.code");
        assertThat(secondCode).isNotEqualTo(firstCode);

        mockMvc.perform(post("/api/v1/invites/{code}/join", firstCode)
                        .with(user("revoked-invite-user")))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.code").value("INVITE_GONE"));

        mockMvc.perform(post("/api/v1/invites/{code}/join", secondCode)
                        .with(user("active-invite-user")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(tripId))
                .andExpect(jsonPath("$.role").value("MEMBER"));
    }

    @Test
    void onlyHostCanIssueAndExpiredInviteIsGone() throws Exception {
        String tripId = createdTripId("permission-host", "permission-trip", "권한 여행");
        MvcResult issue = issueInvite(tripId, "permission-host");
        String code = JsonPath.read(issue.getResponse().getContentAsString(), "$.code");

        mockMvc.perform(post("/api/v1/invites/{code}/join", code)
                        .with(user("permission-member")))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/trips/{tripId}/invites", tripId)
                        .with(user("permission-member")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("INVITE_FORBIDDEN"));

        mockMvc.perform(post("/api/v1/trips/{tripId}/invites", tripId)
                        .with(user("permission-outsider")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("INVITE_FORBIDDEN"));

        jdbcClient.sql("""
                        update public.trip_invite
                        set created_at = current_timestamp - interval '2 minutes',
                            expires_at = current_timestamp - interval '1 minute'
                        where trip_id = cast(:tripId as uuid)
                          and revoked_at is null
                        """)
                .param("tripId", tripId)
                .update();

        mockMvc.perform(post("/api/v1/invites/{code}/join", code)
                        .with(user("expired-invite-user")))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.code").value("INVITE_GONE"));
    }

    @Test
    void joiningTwiceIsIdempotentAndTripAppearsInMemberList() throws Exception {
        String tripId = createdTripId("idempotent-host", "idempotent-trip", "중복 가입 여행");
        String code = JsonPath.read(
                issueInvite(tripId, "idempotent-host").getResponse().getContentAsString(),
                "$.code"
        );

        mockMvc.perform(post("/api/v1/invites/{code}/join", code)
                        .with(user("idempotent-member")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("MEMBER"));

        mockMvc.perform(post("/api/v1/invites/{code}/join", code)
                        .with(user("idempotent-member")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(tripId));

        assertThat(jdbcClient.sql("""
                        select count(*)
                        from public.trip_membership m
                        join public.app_user u on u.id = m.user_id
                        where m.trip_id = cast(:tripId as uuid)
                          and u.cognito_subject = 'idempotent-member'
                          and m.status = 'ACTIVE'
                        """)
                .param("tripId", tripId)
                .query(Integer.class)
                .single()).isEqualTo(1);

        mockMvc.perform(get("/api/v1/trips")
                        .with(user("idempotent-member")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(tripId))
                .andExpect(jsonPath("$.items[0].role").value("MEMBER"));
    }

    @Test
    void concurrentJoinsNeverExceedSixActiveMembers() throws Exception {
        String tripId = createdTripId("capacity-host", "capacity-trip", "정원 여행");
        String code = JsonPath.read(
                issueInvite(tripId, "capacity-host").getResponse().getContentAsString(),
                "$.code"
        );
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(6);

        try {
            List<Future<Integer>> futures = new ArrayList<>();
            for (int index = 0; index < 6; index++) {
                int memberNumber = index;
                futures.add(executor.submit(() -> {
                    start.await();
                    return mockMvc.perform(post("/api/v1/invites/{code}/join", code)
                                    .with(user("capacity-member-" + memberNumber)))
                            .andReturn()
                            .getResponse()
                            .getStatus();
                }));
            }

            start.countDown();
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> future : futures) {
                statuses.add(future.get());
            }

            assertThat(statuses).containsOnly(201, 409);
            assertThat(statuses).filteredOn(status -> status == 201).hasSize(5);
            assertThat(statuses).filteredOn(status -> status == 409).hasSize(1);
        } finally {
            executor.shutdownNow();
        }

        assertThat(jdbcClient.sql("""
                        select count(*)
                        from public.trip_membership
                        where trip_id = cast(:tripId as uuid)
                          and status = 'ACTIVE'
                        """)
                .param("tripId", tripId)
                .query(Integer.class)
                .single()).isEqualTo(6);
    }

    private MvcResult issueInvite(String tripId, String hostSubject) throws Exception {
        return mockMvc.perform(post("/api/v1/trips/{tripId}/invites", tripId)
                        .with(user(hostSubject)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").isNotEmpty())
                .andExpect(jsonPath("$.expiresAt").isNotEmpty())
                .andReturn();
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

    private JwtRequestPostProcessor user(String subject) {
        return jwt().jwt(token -> token
                .subject(subject)
                .claim("name", subject));
    }
}
