package com.chungnamdevelopers.dajeong.api;

import com.chungnamdevelopers.dajeong.api.itinerary.ItineraryCategory;
import com.chungnamdevelopers.dajeong.api.proposal.ProposalCandidate;
import com.chungnamdevelopers.dajeong.api.proposal.ProposalCandidateClient;
import com.chungnamdevelopers.dajeong.api.proposal.ProposalCandidateException;
import com.chungnamdevelopers.dajeong.api.proposal.ProposalGenerationService;
import com.chungnamdevelopers.dajeong.api.proposal.ProposalSearchRequest;
import com.chungnamdevelopers.dajeong.api.proposal.ProposalSetResponse;
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
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

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
@Import(ProposalGenerationIntegrationTests.CandidateClientConfiguration.class)
class ProposalGenerationIntegrationTests {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRESQL =
            new PostgreSQLContainer("postgres:16.15-alpine3.24");

    @Autowired
    private MutableProposalCandidateClient candidateClient;

    @Autowired
    private JdbcClient jdbcClient;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProposalGenerationService generationService;

    @Test
    void createsAtMostThreeDeterministicProposalsWithoutExposingMemberScores()
            throws Exception {
        String host = "proposal-normal-host";
        String member = "proposal-normal-member";
        String outsider = "proposal-normal-outsider";
        String tripId = createdTripId(host, "정상 후보 여행");
        joinTrip(tripId, host, member);
        savePreference(tripId, host, 12_000, 2, 3, "CULTURE", "CAFE");
        savePreference(tripId, member, 8_000, 3, 2, "NATURE", "ACTIVITY");
        String slotId = publishSlot(tripId, host, 0, "야외과학공원", "10:00", "11:30");
        String disruptionId = createDisruption(
                tripId,
                host,
                slotId,
                "날씨 때문에 실내 후보가 필요해요.",
                "normal-disruption"
        );

        String proposalSetId = startReplan(
                disruptionId,
                member,
                "normal-replan"
        );
        assertThat(startReplan(disruptionId, member, "normal-replan"))
                .isEqualTo(proposalSetId);

        String secondDisruptionId = createDisruption(
                tripId,
                host,
                slotId,
                "같은 키 재사용을 막아요.",
                "second-disruption"
        );
        mockMvc.perform(post(
                                "/api/v1/disruptions/{id}/replans",
                                secondDisruptionId
                        )
                        .with(user(member))
                        .header("Idempotency-Key", "normal-replan"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));

        candidateClient.respondFromFixture("/fixtures/proposal/normal.json");
        candidateClient.blockNextSearch();
        CompletableFuture<ProposalSetResponse> generation =
                CompletableFuture.supplyAsync(() -> generationService.generate(
                        UUID.fromString(proposalSetId)
                ));
        try {
            assertThat(candidateClient.awaitBlockedSearch()).isTrue();
            mockMvc.perform(get(
                                    "/api/v1/proposal-sets/{id}",
                                    proposalSetId
                            )
                            .with(user(host)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("GENERATING"));
            assertThat(jdbcClient.sql("""
                            select status
                            from public.disruption
                            where id = cast(:disruptionId as uuid)
                            """)
                    .param("disruptionId", disruptionId)
                    .query(String.class)
                    .single()).isEqualTo("GENERATING");
        } finally {
            candidateClient.releaseBlockedSearch();
        }
        ProposalSetResponse generated = generation.get(10, TimeUnit.SECONDS);
        assertThat(generated.status().name()).isEqualTo("OPEN");
        assertThat(generated.candidateCount()).isEqualTo(3);
        assertThat(generated.proposals())
                .extracting(proposal -> proposal.rank())
                .containsExactly(1, 2, 3);
        assertThat(generationService.generate(UUID.fromString(proposalSetId)))
                .usingRecursiveComparison()
                .isEqualTo(generated);

        MvcResult response = mockMvc.perform(get(
                                "/api/v1/proposal-sets/{id}",
                                proposalSetId
                        )
                        .with(user(host)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.candidateCount").value(3))
                .andExpect(jsonPath("$.proposals.length()").value(3))
                .andReturn();
        String responseBody = response.getResponse().getContentAsString();
        assertThat(responseBody)
                .doesNotContain("userId")
                .doesNotContain("preferredCategories")
                .doesNotContain("categoryMatch")
                .doesNotContain("budgetFit")
                .doesNotContain("utility");
        assertThat(jdbcClient.sql("""
                        select count(*)
                        from public.proposal_member_score pms
                        join public.proposal p
                          on p.id = pms.proposal_id
                        where p.proposal_set_id = cast(:proposalSetId as uuid)
                        """)
                .param("proposalSetId", proposalSetId)
                .query(Integer.class)
                .single()).isEqualTo(6);
        mockMvc.perform(get("/api/v1/proposal-sets/{id}", proposalSetId)
                        .with(user(outsider)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PROPOSAL_FORBIDDEN"));
        assertThat(currentVersionNumber(tripId)).isEqualTo(1);
    }

    @Test
    void handlesPartialEmptyErrorAndStaleResultsWithoutChangingTheItinerary()
            throws Exception {
        candidateClient.respondFromFixture("/fixtures/proposal/partial.json");
        ProposalSetResponse partial = generateForNewTrip(
                "proposal-partial-host",
                "부분 후보 여행",
                "partial-replan"
        );
        assertThat(partial.status().name()).isEqualTo("OPEN");
        assertThat(partial.candidateCount()).isEqualTo(2);
        assertThat(partial.shortageReason()).contains("2개만");
        assertThat(currentVersionNumber(partial.tripId().toString())).isEqualTo(1);

        candidateClient.respondFromFixture("/fixtures/proposal/empty.json");
        ProposalSetResponse empty = generateForNewTrip(
                "proposal-empty-host",
                "빈 후보 여행",
                "empty-replan"
        );
        assertThat(empty.status().name()).isEqualTo("FAILED");
        assertThat(empty.failureCode()).isEqualTo("NO_FEASIBLE_PROPOSAL");
        assertThat(empty.proposals()).isEmpty();
        assertThat(currentVersionNumber(empty.tripId().toString())).isEqualTo(1);

        candidateClient.respondFromFixture("/fixtures/proposal/error.json");
        ProposalSetResponse failed = generateForNewTrip(
                "proposal-error-host",
                "오류 후보 여행",
                "error-replan"
        );
        assertThat(failed.status().name()).isEqualTo("FAILED");
        assertThat(failed.failureCode()).isEqualTo("UPSTREAM_UNAVAILABLE");
        assertThat(currentVersionNumber(failed.tripId().toString())).isEqualTo(1);

        String host = "proposal-stale-host";
        String tripId = createdTripId(host, "오래된 후보 여행");
        savePreference(tripId, host, 10_000, 3, 3, "CULTURE", "CAFE");
        String slotId = publishSlot(tripId, host, 0, "오래된 야외장소", "10:00", "11:00");
        String disruptionId = createDisruption(
                tripId,
                host,
                slotId,
                "버전 변경 전 문제",
                "stale-disruption"
        );
        String proposalSetId = startReplan(disruptionId, host, "stale-replan");
        addSlot(tripId, host, 1, "새 일정 장소", "13:00", "14:00");
        publish(tripId, host, 2);
        candidateClient.respondFromFixture("/fixtures/proposal/normal.json");

        ProposalSetResponse cancelled = generationService.generate(
                UUID.fromString(proposalSetId)
        );
        assertThat(cancelled.status().name()).isEqualTo("CANCELLED");
        assertThat(cancelled.failureCode()).isEqualTo("STALE_ITINERARY");
        assertThat(cancelled.proposals()).isEmpty();
        assertThat(currentVersionNumber(tripId)).isEqualTo(2);
    }

    @Test
    void createsChangesAndWithdrawsOneAnonymousVotePerMember() throws Exception {
        String host = "vote-host";
        String member = "vote-member";
        String outsider = "vote-outsider";
        String tripId = createdTripId(host, "익명 투표 여행");
        joinTrip(tripId, host, member);
        savePreference(tripId, host, 12_000, 2, 3, "CULTURE", "CAFE");
        savePreference(tripId, member, 8_000, 3, 2, "NATURE", "ACTIVITY");
        String slotId = publishSlot(tripId, host, 0, "투표 야외 장소", "10:00", "11:30");
        String disruptionId = createDisruption(
                tripId,
                host,
                slotId,
                "투표할 후보가 필요해요.",
                "vote-disruption"
        );
        String proposalSetId = startReplan(disruptionId, host, "vote-replan");
        candidateClient.respondFromFixture("/fixtures/proposal/normal.json");
        ProposalSetResponse generated = generationService.generate(
                UUID.fromString(proposalSetId)
        );
        String firstProposalId = generated.proposals().get(0).id().toString();
        String secondProposalId = generated.proposals().get(1).id().toString();
        assertThat(generated.eligibleMemberCount()).isEqualTo(2);
        assertThat(generated.participantCount()).isZero();
        assertThat(generated.votingOpenedAt()).isNotNull();
        assertThat(generated.votingDeadlineAt()).isAfter(generated.votingOpenedAt());

        vote(proposalSetId, host, firstProposalId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participantCount").value(1))
                .andExpect(jsonPath("$.myVoteProposalId").value(firstProposalId))
                .andExpect(jsonPath("$.proposals[0].voteCount").value(1));
        vote(proposalSetId, host, firstProposalId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participantCount").value(1))
                .andExpect(jsonPath("$.proposals[0].voteCount").value(1));
        vote(proposalSetId, host, secondProposalId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participantCount").value(1))
                .andExpect(jsonPath("$.proposals[0].voteCount").value(0))
                .andExpect(jsonPath("$.proposals[1].voteCount").value(1));
        vote(proposalSetId, member, secondProposalId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participantCount").value(2))
                .andExpect(jsonPath("$.eligibleMemberCount").value(2))
                .andExpect(jsonPath("$.proposals[1].voteCount").value(2));

        MvcResult hostView = mockMvc.perform(get(
                                "/api/v1/proposal-sets/{id}",
                                proposalSetId
                        )
                        .with(user(host)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.myVoteProposalId").value(secondProposalId))
                .andReturn();
        assertThat(hostView.getResponse().getContentAsString())
                .doesNotContain(member)
                .doesNotContain("userId")
                .doesNotContain("voter");

        withdrawVote(proposalSetId, host)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participantCount").value(1))
                .andExpect(jsonPath("$.myVoteProposalId").doesNotExist())
                .andExpect(jsonPath("$.proposals[1].voteCount").value(1));
        withdrawVote(proposalSetId, host)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participantCount").value(1));
        mockMvc.perform(get("/api/v1/proposal-sets/{id}", proposalSetId)
                        .with(user(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.myVoteProposalId").value(secondProposalId));
        vote(proposalSetId, outsider, firstProposalId)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PROPOSAL_FORBIDDEN"));

        assertThat(jdbcClient.sql("""
                        select count(*)
                        from public.vote
                        where proposal_set_id = cast(:proposalSetId as uuid)
                        """)
                .param("proposalSetId", proposalSetId)
                .query(Integer.class)
                .single()).isEqualTo(1);
    }

    @Test
    void rejectsCandidatesFromAnotherSetAndVotesOutsideTheOpenWindow()
            throws Exception {
        String host = "vote-boundary-host";
        String tripId = createdTripId(host, "투표 경계 여행");
        savePreference(tripId, host, 10_000, 3, 3, "CULTURE", "CAFE");
        String slotId = publishSlot(tripId, host, 0, "투표 경계 장소", "10:00", "11:00");
        candidateClient.respondFromFixture("/fixtures/proposal/normal.json");

        String firstDisruptionId = createDisruption(
                tripId,
                host,
                slotId,
                "첫 번째 투표",
                "vote-boundary-first-disruption"
        );
        String firstSetId = startReplan(
                firstDisruptionId,
                host,
                "vote-boundary-first-replan"
        );
        ProposalSetResponse firstSet = generationService.generate(
                UUID.fromString(firstSetId)
        );

        String secondDisruptionId = createDisruption(
                tripId,
                host,
                slotId,
                "두 번째 투표",
                "vote-boundary-second-disruption"
        );
        String secondSetId = startReplan(
                secondDisruptionId,
                host,
                "vote-boundary-second-replan"
        );
        ProposalSetResponse secondSet = generationService.generate(
                UUID.fromString(secondSetId)
        );

        vote(firstSetId, host, secondSet.proposals().get(0).id().toString())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PROPOSAL_NOT_IN_SET"));

        jdbcClient.sql("""
                        update public.proposal_set
                        set voting_opened_at = current_timestamp - interval '13 hours',
                            voting_deadline_at = current_timestamp - interval '1 hour'
                        where id = cast(:proposalSetId as uuid)
                        """)
                .param("proposalSetId", firstSetId)
                .update();
        vote(firstSetId, host, firstSet.proposals().get(0).id().toString())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VOTE_CLOSED"));
        withdrawVote(firstSetId, host)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VOTE_CLOSED"));

        jdbcClient.sql("""
                        update public.proposal_set
                        set status = 'FAILED'
                        where id = cast(:proposalSetId as uuid)
                        """)
                .param("proposalSetId", secondSetId)
                .update();
        vote(secondSetId, host, secondSet.proposals().get(0).id().toString())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VOTE_CLOSED"));
    }

    private ResultActions vote(
            String proposalSetId,
            String subject,
            String proposalId
    ) throws Exception {
        return mockMvc.perform(put(
                                "/api/v1/proposal-sets/{id}/vote",
                                proposalSetId
                        )
                        .with(user(subject))
                        .contentType("application/json")
                        .content("""
                                {
                                  "proposalId": "%s"
                                }
                                """.formatted(proposalId)));
    }

    private ResultActions withdrawVote(
            String proposalSetId,
            String subject
    ) throws Exception {
        return mockMvc.perform(delete(
                                "/api/v1/proposal-sets/{id}/vote",
                                proposalSetId
                        )
                .with(user(subject)));
    }

    private ProposalSetResponse generateForNewTrip(
            String host,
            String title,
            String replanKey
    ) throws Exception {
        String tripId = createdTripId(host, title);
        savePreference(tripId, host, 10_000, 3, 3, "CULTURE", "CAFE");
        String slotId = publishSlot(tripId, host, 0, title + " 야외", "10:00", "11:00");
        String disruptionId = createDisruption(
                tripId,
                host,
                slotId,
                "후보 생성 테스트",
                replanKey + "-disruption"
        );
        String proposalSetId = startReplan(disruptionId, host, replanKey);
        return generationService.generate(UUID.fromString(proposalSetId));
    }

    private String startReplan(
            String disruptionId,
            String subject,
            String idempotencyKey
    ) throws Exception {
        MvcResult result = mockMvc.perform(post(
                                "/api/v1/disruptions/{id}/replans",
                                disruptionId
                        )
                        .with(user(subject))
                        .header("Idempotency-Key", idempotencyKey))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.disruptionStatus").value("ACKNOWLEDGED"))
                .andExpect(jsonPath("$.proposalSet.status").value("QUEUED"))
                .andReturn();
        return JsonPath.read(
                result.getResponse().getContentAsString(),
                "$.proposalSet.id"
        );
    }

    private String createDisruption(
            String tripId,
            String subject,
            String slotId,
            String description,
            String idempotencyKey
    ) throws Exception {
        MvcResult result = mockMvc.perform(post(
                                "/api/v1/trips/{tripId}/disruptions",
                                tripId
                        )
                        .with(user(subject))
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType("application/json")
                        .content("""
                                {
                                  "itinerarySlotId": "%s",
                                  "type": "OTHER",
                                  "description": "%s"
                                }
                                """.formatted(slotId, description)))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }

    private String publishSlot(
            String tripId,
            String host,
            long revision,
            String placeName,
            String startsAt,
            String endsAt
    ) throws Exception {
        addSlot(tripId, host, revision, placeName, startsAt, endsAt);
        return publish(tripId, host, revision + 1);
    }

    private void addSlot(
            String tripId,
            String host,
            long revision,
            String placeName,
            String startsAt,
            String endsAt
    ) throws Exception {
        mockMvc.perform(post(
                                "/api/v1/trips/{tripId}/itineraries/draft/slots",
                                tripId
                        )
                        .with(user(host))
                        .header("If-Match", revision)
                        .header(
                                "Idempotency-Key",
                                "proposal-slot-" + tripId + "-" + revision
                        )
                        .contentType("application/json")
                        .content(slotJson(placeName, startsAt, endsAt)))
                .andExpect(status().isCreated());
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
                                "proposal-publish-" + tripId + "-" + revision
                        ))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.slots[0].id");
    }

    private void savePreference(
            String tripId,
            String subject,
            int budget,
            int activity,
            int travel,
            String firstCategory,
            String secondCategory
    ) throws Exception {
        mockMvc.perform(put("/api/v1/trips/{tripId}/preferences/me", tripId)
                        .with(user(subject))
                        .contentType("application/json")
                        .content("""
                                {
                                  "budgetPerPerson": %d,
                                  "activityLevel": %d,
                                  "travelTolerance": %d,
                                  "preferredCategories": ["%s", "%s"],
                                  "priorities": ["FLEXIBLE_SCHEDULE"]
                                }
                                """.formatted(
                                budget,
                                activity,
                                travel,
                                firstCategory,
                                secondCategory
                        )))
                .andExpect(status().isOk());
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
        mockMvc.perform(post("/api/v1/invites/{code}/join", code)
                        .with(user(member)))
                .andExpect(status().isCreated());
    }

    private String createdTripId(String subject, String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/trips")
                        .with(user(subject))
                        .header("Idempotency-Key", "proposal-trip-" + subject)
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

    private int currentVersionNumber(String tripId) {
        return jdbcClient.sql("""
                        select max(version_number)
                        from public.itinerary_version
                        where trip_id = cast(:tripId as uuid)
                        """)
                .param("tripId", tripId)
                .query(Integer.class)
                .single();
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
                  "indoor": false,
                  "category": "CULTURE",
                  "expectedCost": 3000
                }
                """.formatted(startsAt, endsAt, placeName);
    }

    private JwtRequestPostProcessor user(String subject) {
        return jwt().jwt(token -> token.subject(subject).claim("name", subject));
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class CandidateClientConfiguration {

        @Bean
        MutableProposalCandidateClient proposalCandidateClient() {
            return new MutableProposalCandidateClient();
        }
    }

    static class MutableProposalCandidateClient implements ProposalCandidateClient {

        private List<ProposalCandidate> candidates = List.of();
        private String failureMessage;
        private volatile CountDownLatch searchEntered;
        private volatile CountDownLatch searchRelease;

        @Override
        public List<ProposalCandidate> search(ProposalSearchRequest request) {
            CountDownLatch entered = searchEntered;
            CountDownLatch release = searchRelease;
            if (entered != null && release != null) {
                entered.countDown();
                try {
                    if (!release.await(10, TimeUnit.SECONDS)) {
                        throw new ProposalCandidateException(
                                "후보 검색 차단이 제한 시간 안에 해제되지 않았습니다."
                        );
                    }
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw new ProposalCandidateException(
                            "후보 검색 대기가 중단되었습니다."
                    );
                } finally {
                    searchEntered = null;
                    searchRelease = null;
                }
            }
            if (failureMessage != null) {
                throw new ProposalCandidateException(failureMessage);
            }
            return candidates;
        }

        void blockNextSearch() {
            searchEntered = new CountDownLatch(1);
            searchRelease = new CountDownLatch(1);
        }

        boolean awaitBlockedSearch() throws InterruptedException {
            CountDownLatch entered = searchEntered;
            return entered != null && entered.await(10, TimeUnit.SECONDS);
        }

        void releaseBlockedSearch() {
            CountDownLatch release = searchRelease;
            if (release != null) {
                release.countDown();
            }
        }

        void respondFromFixture(String resourcePath) throws IOException {
            String payload;
            try (InputStream input = getClass().getResourceAsStream(resourcePath)) {
                if (input == null) {
                    throw new IOException("후보 fixture를 찾을 수 없습니다: " + resourcePath);
                }
                payload = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            }
            String status = JsonPath.read(payload, "$.status");
            if ("ERROR".equals(status)) {
                failureMessage = JsonPath.read(payload, "$.message");
                candidates = List.of();
                return;
            }
            List<Map<String, Object>> rows = JsonPath.read(payload, "$.candidates");
            candidates = rows.stream()
                    .map(row -> new ProposalCandidate(
                            (String) row.get("sourceCandidateId"),
                            (String) row.get("placeName"),
                            (String) row.get("address"),
                            new BigDecimal(row.get("latitude").toString()),
                            new BigDecimal(row.get("longitude").toString()),
                            (Boolean) row.get("indoor"),
                            ItineraryCategory.valueOf((String) row.get("category")),
                            ((Number) row.get("expectedCost")).intValue(),
                            ((Number) row.get("totalTravelMinutes")).intValue(),
                            ((Number) row.get("activityLevel")).intValue(),
                            (Boolean) row.get("verifiedOpen")
                    ))
                    .toList();
            failureMessage = null;
        }
    }
}
