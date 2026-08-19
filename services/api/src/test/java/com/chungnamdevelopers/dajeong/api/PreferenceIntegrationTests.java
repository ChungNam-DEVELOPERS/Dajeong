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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Testcontainers
class PreferenceIntegrationTests {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:16.15-alpine3.24");

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unauthenticatedPreferenceRequestsAreRejected() throws Exception {
        UUID tripId = UUID.randomUUID();

        mockMvc.perform(get("/api/v1/trips/{tripId}/preferences/me", tripId))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/v1/trips/{tripId}/preferences/me", tripId)
                        .contentType("application/json")
                        .content(preferenceJson(50_000, 3, 2)))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/trips/{tripId}/preferences/status", tripId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void membersOnlyReadTheirOwnPreferenceWhileStatusExposesCompletionOnly()
            throws Exception {
        String host = "preference-host";
        String member = "preference-member";
        String tripId = createdTripId(host, "선호 여행");
        joinTrip(tripId, host, member);

        mockMvc.perform(get("/api/v1/trips/{tripId}/preferences/me", tripId)
                        .with(user(member, "멤버 이름")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PREFERENCE_NOT_SUBMITTED"));

        mockMvc.perform(get("/api/v1/trips/{tripId}/preferences/status", tripId)
                        .with(user(host, "방장 이름")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submittedCount").value(0))
                .andExpect(jsonPath("$.totalCount").value(2))
                .andExpect(jsonPath("$.members[0].role").value("HOST"))
                .andExpect(jsonPath("$.members[0].submitted").value(false));

        mockMvc.perform(put("/api/v1/trips/{tripId}/preferences/me", tripId)
                        .with(user(host, "방장 이름"))
                        .contentType("application/json")
                        .content(preferenceJson(60_000, 4, 2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.budgetPerPerson").value(60_000))
                .andExpect(jsonPath("$.preferredCategories[0]").value("NATURE"))
                .andExpect(jsonPath("$.priorities.length()").value(2));

        mockMvc.perform(put("/api/v1/trips/{tripId}/preferences/me", tripId)
                        .with(user(member, "멤버 이름"))
                        .contentType("application/json")
                        .content(preferenceJson(35_000, 2, 5)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.budgetPerPerson").value(35_000));

        mockMvc.perform(get("/api/v1/trips/{tripId}/preferences/me", tripId)
                        .with(user(host, "방장 이름")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.budgetPerPerson").value(60_000));
        mockMvc.perform(get("/api/v1/trips/{tripId}/preferences/me", tripId)
                        .with(user(member, "멤버 이름")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.budgetPerPerson").value(35_000));

        MvcResult statusResult = mockMvc.perform(get(
                                "/api/v1/trips/{tripId}/preferences/status",
                                tripId
                        )
                        .with(user(member, "멤버 이름")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submittedCount").value(2))
                .andExpect(jsonPath("$.totalCount").value(2))
                .andExpect(jsonPath("$.members[0].submitted").value(true))
                .andExpect(jsonPath("$.members[1].submitted").value(true))
                .andExpect(jsonPath("$.members[0].budgetPerPerson").doesNotExist())
                .andExpect(jsonPath("$.members[0].preferredCategories").doesNotExist())
                .andReturn();
        String statusBody = statusResult.getResponse().getContentAsString();
        assertThat(statusBody)
                .doesNotContain("budgetPerPerson")
                .doesNotContain("activityLevel")
                .doesNotContain("travelTolerance")
                .doesNotContain("preferredCategories")
                .doesNotContain("priorities");

        mockMvc.perform(put("/api/v1/trips/{tripId}/preferences/me", tripId)
                        .with(user(member, "멤버 이름"))
                        .contentType("application/json")
                        .content(duplicateCategoryJson()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PREFERENCE"));

        mockMvc.perform(put("/api/v1/trips/{tripId}/preferences/me", tripId)
                        .with(user(member, "멤버 이름"))
                        .contentType("application/json")
                        .content(invalidPreferenceBoundsJson()))
                .andExpect(status().isBadRequest());

        assertThat(jdbcClient.sql("""
                        select budget_per_person
                        from public.private_preference p
                        join public.app_user u on u.id = p.user_id
                        where p.trip_id = cast(:tripId as uuid)
                        order by budget_per_person
                        """)
                .param("tripId", tripId)
                .query(Integer.class)
                .list()).containsExactly(35_000, 60_000);

        mockMvc.perform(delete("/api/v1/me").with(user(member, "멤버 이름")))
                .andExpect(status().isNoContent());
        assertThat(jdbcClient.sql("""
                        select count(*)
                        from public.private_preference p
                        join public.app_user u on u.id = p.user_id
                        where u.cognito_subject like 'deleted:%'
                        """)
                .query(Integer.class)
                .single()).isZero();
    }

    @Test
    void outsidersAreRejectedAndCompletedTripsKeepPreferencesReadOnly()
            throws Exception {
        String host = "preference-state-host";
        String tripId = createdTripId(host, "선호 상태 여행");

        mockMvc.perform(get("/api/v1/trips/{tripId}/preferences/status", tripId)
                        .with(user("preference-outsider", "외부 사용자")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PREFERENCE_FORBIDDEN"));

        mockMvc.perform(put("/api/v1/trips/{tripId}/preferences/me", tripId)
                        .with(user(host, "방장"))
                        .contentType("application/json")
                        .content(preferenceJson(45_000, 3, 3)))
                .andExpect(status().isOk());

        jdbcClient.sql("""
                        update public.trip
                        set status = 'COMPLETED'
                        where id = cast(:tripId as uuid)
                        """)
                .param("tripId", tripId)
                .update();

        mockMvc.perform(get("/api/v1/trips/{tripId}/preferences/me", tripId)
                        .with(user(host, "방장")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.budgetPerPerson").value(45_000));
        mockMvc.perform(put("/api/v1/trips/{tripId}/preferences/me", tripId)
                        .with(user(host, "방장"))
                        .contentType("application/json")
                        .content(preferenceJson(70_000, 5, 5)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PREFERENCE_NOT_EDITABLE"));
    }

    private String createdTripId(String subject, String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/trips")
                        .with(user(subject, title + " 방장"))
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

    private void joinTrip(String tripId, String host, String member) throws Exception {
        MvcResult invitation = mockMvc.perform(post(
                                "/api/v1/trips/{tripId}/invites",
                                tripId
                        )
                        .with(user(host, "방장 이름")))
                .andExpect(status().isCreated())
                .andReturn();
        String code = JsonPath.read(
                invitation.getResponse().getContentAsString(),
                "$.code"
        );
        mockMvc.perform(post("/api/v1/invites/{code}/join", code)
                        .with(user(member, "멤버 이름")))
                .andExpect(status().isCreated());
    }

    private String preferenceJson(int budget, int activity, int travel) {
        return """
                {
                  "budgetPerPerson": %d,
                  "activityLevel": %d,
                  "travelTolerance": %d,
                  "preferredCategories": ["NATURE", "FOOD", "CAFE"],
                  "priorities": ["FLEXIBLE_SCHEDULE", "NATURE_HEALING"]
                }
                """.formatted(budget, activity, travel);
    }

    private String duplicateCategoryJson() {
        return """
                {
                  "budgetPerPerson": 35000,
                  "activityLevel": 2,
                  "travelTolerance": 5,
                  "preferredCategories": ["NATURE", "NATURE"],
                  "priorities": ["SAVE_BUDGET"]
                }
                """;
    }

    private String invalidPreferenceBoundsJson() {
        return """
                {
                  "budgetPerPerson": 100000001,
                  "activityLevel": 0,
                  "travelTolerance": 6,
                  "preferredCategories": [],
                  "priorities": ["SAVE_BUDGET", "MINIMIZE_TRAVEL", "NATURE_HEALING"]
                }
                """;
    }

    private JwtRequestPostProcessor user(String subject, String displayName) {
        return jwt().jwt(token -> token
                .subject(subject)
                .claim("name", displayName));
    }
}
