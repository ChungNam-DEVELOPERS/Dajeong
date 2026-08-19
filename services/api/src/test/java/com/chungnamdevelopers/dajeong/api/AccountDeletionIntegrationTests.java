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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Testcontainers
class AccountDeletionIntegrationTests {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:16.15-alpine3.24");

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unauthenticatedDeletionIsRejected() throws Exception {
        mockMvc.perform(delete("/api/v1/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deletionBeforeProfileCreationIsIdempotentAndBlocksTheSameToken() throws Exception {
        JwtRequestPostProcessor deletedUser = user("delete-before-profile", "삭제 전 사용자");
        int tombstoneCountBefore = jdbcClient.sql(
                        "select count(*) from public.deleted_identity"
                )
                .query(Integer.class)
                .single();

        mockMvc.perform(delete("/api/v1/me").with(deletedUser))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/v1/me").with(deletedUser))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/me").with(deletedUser))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.code").value("ACCOUNT_DELETED"));

        assertThat(jdbcClient.sql("select count(*) from public.deleted_identity")
                .query(Integer.class)
                .single()).isEqualTo(tombstoneCountBefore + 1);
        assertThat(jdbcClient.sql("""
                        select count(*)
                        from public.app_user
                        where cognito_subject = 'delete-before-profile'
                        """)
                .query(Integer.class)
                .single()).isZero();
        assertThat(jdbcClient.sql("""
                        select count(*)
                        from public.deleted_identity
                        where subject_hash = 'delete-before-profile'
                        """)
                .query(Integer.class)
                .single()).isZero();
    }

    @Test
    void deletionAnonymizesIdentityAndClosesMembershipsTripsAndInvites() throws Exception {
        String tripId = createdTripId(
                "deletion-host",
                "삭제될 방장",
                "account-deletion-trip",
                "삭제 처리 여행"
        );
        String firstCode = issuedInviteCode(tripId, "deletion-host", "삭제될 방장");

        mockMvc.perform(post("/api/v1/invites/{code}/join", firstCode)
                        .with(user("deletion-member", "삭제될 멤버")))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/v1/me")
                        .with(user("deletion-member", "삭제될 멤버")))
                .andExpect(status().isNoContent());

        assertAnonymizedUser("deletion-member", "삭제될 멤버");
        assertThat(membershipStatus(tripId, "deleted:"))
                .contains("LEFT");
        assertThat(tripStatus(tripId)).isEqualTo("DRAFT");
        assertThat(activeMembershipCount(tripId)).isEqualTo(1);

        String activeCode = issuedInviteCode(tripId, "deletion-host", "삭제될 방장");
        mockMvc.perform(delete("/api/v1/me")
                        .with(user("deletion-host", "삭제될 방장")))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/v1/me")
                        .with(user("deletion-host", "삭제될 방장")))
                .andExpect(status().isNoContent());

        assertAnonymizedUser("deletion-host", "삭제될 방장");
        assertThat(tripStatus(tripId)).isEqualTo("ARCHIVED");
        assertThat(activeMembershipCount(tripId)).isZero();
        assertThat(jdbcClient.sql("""
                        select count(*)
                        from public.trip_invite
                        where trip_id = cast(:tripId as uuid)
                          and revoked_at is null
                        """)
                .param("tripId", tripId)
                .query(Integer.class)
                .single()).isZero();

        mockMvc.perform(post("/api/v1/invites/{code}/join", activeCode)
                        .with(user("after-deletion-outsider", "가입 시도자")))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.code").value("INVITE_GONE"));
        mockMvc.perform(get("/api/v1/me")
                        .with(user("deletion-host", "삭제될 방장")))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.code").value("ACCOUNT_DELETED"));
        mockMvc.perform(get("/api/v1/trips")
                        .with(user("deletion-host", "삭제될 방장")))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.code").value("ACCOUNT_DELETED"));
    }

    private String createdTripId(
            String subject,
            String displayName,
            String idempotencyKey,
            String title
    ) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/trips")
                        .with(user(subject, displayName))
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
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

    private String issuedInviteCode(
            String tripId,
            String subject,
            String displayName
    ) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/trips/{tripId}/invites", tripId)
                        .with(user(subject, displayName)))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.code");
    }

    private void assertAnonymizedUser(String originalSubject, String originalName) {
        assertThat(jdbcClient.sql("""
                        select count(*)
                        from public.app_user
                        where cognito_subject = :subject
                           or display_name = :displayName
                        """)
                .param("subject", originalSubject)
                .param("displayName", originalName)
                .query(Integer.class)
                .single()).isZero();

        assertThat(jdbcClient.sql("""
                        select count(*)
                        from public.app_user
                        where cognito_subject like 'deleted:%'
                          and display_name = '탈퇴한 멤버'
                          and status = 'DELETED'
                          and deleted_at is not null
                        """)
                .query(Integer.class)
                .single()).isGreaterThanOrEqualTo(1);
    }

    private String tripStatus(String tripId) {
        return jdbcClient.sql("""
                        select status
                        from public.trip
                        where id = cast(:tripId as uuid)
                        """)
                .param("tripId", tripId)
                .query(String.class)
                .single();
    }

    private int activeMembershipCount(String tripId) {
        return jdbcClient.sql("""
                        select count(*)
                        from public.trip_membership
                        where trip_id = cast(:tripId as uuid)
                          and status = 'ACTIVE'
                        """)
                .param("tripId", tripId)
                .query(Integer.class)
                .single();
    }

    private java.util.List<String> membershipStatus(
            String tripId,
            String subjectPrefix
    ) {
        return jdbcClient.sql("""
                        select m.status
                        from public.trip_membership m
                        join public.app_user u on u.id = m.user_id
                        where m.trip_id = cast(:tripId as uuid)
                          and u.cognito_subject like :subjectPrefix
                        """)
                .param("tripId", tripId)
                .param("subjectPrefix", subjectPrefix + "%")
                .query(String.class)
                .list();
    }

    private JwtRequestPostProcessor user(String subject, String displayName) {
        return jwt().jwt(token -> token
                .subject(subject)
                .claim("name", displayName));
    }
}
