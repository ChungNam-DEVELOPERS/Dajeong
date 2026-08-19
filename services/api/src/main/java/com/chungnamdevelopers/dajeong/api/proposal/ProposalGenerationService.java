package com.chungnamdevelopers.dajeong.api.proposal;

import com.chungnamdevelopers.dajeong.api.error.ApiException;
import com.chungnamdevelopers.dajeong.api.preference.PreferenceCategory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Function;

@Service
public class ProposalGenerationService {

    private static final BigDecimal DAEJEON_MIN_LATITUDE = new BigDecimal("36.10");
    private static final BigDecimal DAEJEON_MAX_LATITUDE = new BigDecimal("36.55");
    private static final BigDecimal DAEJEON_MIN_LONGITUDE = new BigDecimal("127.20");
    private static final BigDecimal DAEJEON_MAX_LONGITUDE = new BigDecimal("127.60");

    private final ObjectProvider<JdbcClient> jdbcClientProvider;
    private final ObjectProvider<ProposalCandidateClient> candidateClientProvider;
    private final ObjectProvider<PlatformTransactionManager> transactionManagerProvider;
    private final ProposalScorer scorer;
    private final ProposalService proposalService;

    public ProposalGenerationService(
            ObjectProvider<JdbcClient> jdbcClientProvider,
            ObjectProvider<ProposalCandidateClient> candidateClientProvider,
            ObjectProvider<PlatformTransactionManager> transactionManagerProvider,
            ProposalScorer scorer,
            ProposalService proposalService
    ) {
        this.jdbcClientProvider = jdbcClientProvider;
        this.candidateClientProvider = candidateClientProvider;
        this.transactionManagerProvider = transactionManagerProvider;
        this.scorer = scorer;
        this.proposalService = proposalService;
    }

    public ProposalSetResponse generate(UUID proposalSetId) {
        GenerationPreparation preparation = inTransaction(
                jdbcClient -> prepare(jdbcClient, proposalSetId)
        );
        if (!preparation.ready()) {
            return preparation.response();
        }
        GenerationContext context = preparation.context();
        ProposalCandidateClient client = candidateClientProvider.getIfAvailable();
        if (client == null) {
            return finish(
                    proposalSetId,
                    ProposalSetStatus.FAILED,
                    "UPSTREAM_UNAVAILABLE"
            );
        }

        List<ProposalCandidate> candidates;
        try {
            candidates = validCandidates(client.search(new ProposalSearchRequest(
                    context.proposalSetId(),
                    context.tripId(),
                    context.itineraryVersionId(),
                    context.slotId(),
                    context.startsAt(),
                    context.endsAt(),
                    context.latitude(),
                    context.longitude()
            )));
        } catch (ProposalCandidateException exception) {
            return finish(
                    proposalSetId,
                    ProposalSetStatus.FAILED,
                    "UPSTREAM_UNAVAILABLE"
            );
        }

        List<ScoredProposalCandidate> ranked = scorer.rank(
                        candidates,
                        preparation.preferences()
                )
                .stream()
                .limit(context.candidateLimit())
                .toList();
        if (ranked.isEmpty()) {
            return finish(
                    proposalSetId,
                    ProposalSetStatus.FAILED,
                    "NO_FEASIBLE_PROPOSAL"
            );
        }
        return inTransaction(jdbcClient -> complete(
                jdbcClient,
                proposalSetId,
                ranked
        ));
    }

    private GenerationPreparation prepare(
            JdbcClient jdbcClient,
            UUID proposalSetId
    ) {
        GenerationContext context = lockContext(jdbcClient, proposalSetId);
        if (context.status() != ProposalSetStatus.QUEUED) {
            return GenerationPreparation.finished(
                    proposalService.loadResponse(jdbcClient, proposalSetId)
            );
        }
        markGenerating(jdbcClient, context);
        UUID currentVersionId = loadCurrentVersionId(jdbcClient, context.tripId());
        if (!context.itineraryVersionId().equals(currentVersionId)) {
            finishWithoutCandidates(
                    jdbcClient,
                    context,
                    ProposalSetStatus.CANCELLED,
                    "STALE_ITINERARY"
            );
            return GenerationPreparation.finished(
                    proposalService.loadResponse(jdbcClient, proposalSetId)
            );
        }
        if (context.latitude() == null || context.longitude() == null) {
            finishWithoutCandidates(
                    jdbcClient,
                    context,
                    ProposalSetStatus.FAILED,
                    "INVALID_SOURCE_SLOT"
            );
            return GenerationPreparation.finished(
                    proposalService.loadResponse(jdbcClient, proposalSetId)
            );
        }
        List<ProposalMemberPreference> preferences = loadPreferences(
                jdbcClient,
                context.tripId()
        );
        if (preferences.isEmpty()) {
            finishWithoutCandidates(
                    jdbcClient,
                    context,
                    ProposalSetStatus.FAILED,
                    "PREFERENCES_INCOMPLETE"
            );
            return GenerationPreparation.finished(
                    proposalService.loadResponse(jdbcClient, proposalSetId)
            );
        }
        updateSnapshotHash(
                jdbcClient,
                proposalSetId,
                snapshotHash(context.itineraryVersionId(), preferences)
        );
        return GenerationPreparation.ready(context, preferences);
    }

    private ProposalSetResponse complete(
            JdbcClient jdbcClient,
            UUID proposalSetId,
            List<ScoredProposalCandidate> ranked
    ) {
        GenerationContext context = lockContext(jdbcClient, proposalSetId);
        if (context.status() != ProposalSetStatus.GENERATING) {
            return proposalService.loadResponse(jdbcClient, proposalSetId);
        }
        if (!context.itineraryVersionId().equals(
                loadCurrentVersionId(jdbcClient, context.tripId())
        )) {
            finishWithoutCandidates(
                    jdbcClient,
                    context,
                    ProposalSetStatus.CANCELLED,
                    "STALE_ITINERARY"
            );
            return proposalService.loadResponse(jdbcClient, proposalSetId);
        }

        for (int index = 0; index < ranked.size(); index++) {
            insertProposal(jdbcClient, context, ranked.get(index), index + 1);
        }
        String shortageReason = ranked.size() < context.candidateLimit()
                ? "검증 가능한 후보가 %d개만 확보되었습니다.".formatted(ranked.size())
                : null;
        jdbcClient.sql("""
                        update public.proposal_set
                        set status = 'OPEN',
                            shortage_reason = :shortageReason,
                            failure_code = null,
                            completed_at = current_timestamp,
                            updated_at = current_timestamp
                        where id = :id
                        """)
                .param("shortageReason", shortageReason)
                .param("id", proposalSetId)
                .update();
        jdbcClient.sql("""
                        update public.disruption
                        set status = 'VOTING',
                            updated_at = current_timestamp
                        where id = :id
                        """)
                .param("id", context.disruptionId())
                .update();
        return proposalService.loadResponse(jdbcClient, proposalSetId);
    }

    private ProposalSetResponse finish(
            UUID proposalSetId,
            ProposalSetStatus status,
            String failureCode
    ) {
        return inTransaction(jdbcClient -> {
            GenerationContext context = lockContext(jdbcClient, proposalSetId);
            if (context.status() == ProposalSetStatus.OPEN
                    || context.status() == ProposalSetStatus.FAILED
                    || context.status() == ProposalSetStatus.CANCELLED) {
                return proposalService.loadResponse(jdbcClient, proposalSetId);
            }
            finishWithoutCandidates(jdbcClient, context, status, failureCode);
            return proposalService.loadResponse(jdbcClient, proposalSetId);
        });
    }

    private <T> T inTransaction(Function<JdbcClient, T> operation) {
        JdbcClient jdbcClient = requireJdbcClient();
        PlatformTransactionManager transactionManager =
                transactionManagerProvider.getIfAvailable();
        if (transactionManager == null) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "PROPOSAL_STORE_UNAVAILABLE",
                    "후보 트랜잭션 저장소가 구성되지 않았습니다."
            );
        }
        T result = new TransactionTemplate(transactionManager)
                .execute(status -> operation.apply(jdbcClient));
        return Objects.requireNonNull(result, "후보 트랜잭션 결과");
    }

    private GenerationContext lockContext(JdbcClient jdbcClient, UUID proposalSetId) {
        return jdbcClient.sql("""
                        select
                            ps.id,
                            ps.disruption_id,
                            ps.trip_id,
                            ps.itinerary_version_id,
                            ps.status,
                            ps.candidate_limit,
                            d.itinerary_slot_id,
                            s.starts_at,
                            s.ends_at,
                            s.latitude,
                            s.longitude
                        from public.proposal_set ps
                        join public.disruption d
                          on d.id = ps.disruption_id
                        join public.itinerary_slot s
                          on s.id = d.itinerary_slot_id
                        where ps.id = :id
                        for update of ps, d
                        """)
                .param("id", proposalSetId)
                .query((resultSet, rowNumber) -> new GenerationContext(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getObject("disruption_id", UUID.class),
                        resultSet.getObject("trip_id", UUID.class),
                        resultSet.getObject("itinerary_version_id", UUID.class),
                        ProposalSetStatus.valueOf(resultSet.getString("status")),
                        resultSet.getInt("candidate_limit"),
                        resultSet.getObject("itinerary_slot_id", UUID.class),
                        resultSet.getObject("starts_at", Timestamp.class).toInstant(),
                        resultSet.getObject("ends_at", Timestamp.class).toInstant(),
                        resultSet.getBigDecimal("latitude"),
                        resultSet.getBigDecimal("longitude")
                ))
                .optional()
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "PROPOSAL_SET_NOT_FOUND",
                        "후보 작업을 찾을 수 없습니다."
                ));
    }

    private void markGenerating(JdbcClient jdbcClient, GenerationContext context) {
        jdbcClient.sql("""
                        update public.proposal_set
                        set status = 'GENERATING',
                            started_at = coalesce(started_at, current_timestamp),
                            updated_at = current_timestamp
                        where id = :id
                        """)
                .param("id", context.proposalSetId())
                .update();
        jdbcClient.sql("""
                        update public.disruption
                        set status = 'GENERATING',
                            updated_at = current_timestamp
                        where id = :id
                        """)
                .param("id", context.disruptionId())
                .update();
    }

    private UUID loadCurrentVersionId(JdbcClient jdbcClient, UUID tripId) {
        return jdbcClient.sql("""
                        select id
                        from public.itinerary_version
                        where trip_id = :tripId
                        order by version_number desc
                        limit 1
                        """)
                .param("tripId", tripId)
                .query(UUID.class)
                .optional()
                .orElseThrow(() -> new ApiException(
                        HttpStatus.CONFLICT,
                        "ITINERARY_NOT_PUBLISHED",
                        "발행된 일정이 없어 후보를 만들 수 없습니다."
                ));
    }

    private List<ProposalMemberPreference> loadPreferences(
            JdbcClient jdbcClient,
            UUID tripId
    ) {
        List<PreferenceBase> bases = jdbcClient.sql("""
                        select
                            m.user_id,
                            p.budget_per_person,
                            p.activity_level,
                            p.travel_tolerance
                        from public.trip_membership m
                        left join public.private_preference p
                          on p.trip_id = m.trip_id
                         and p.user_id = m.user_id
                        where m.trip_id = :tripId
                          and m.status = 'ACTIVE'
                        order by m.user_id
                        """)
                .param("tripId", tripId)
                .query((resultSet, rowNumber) -> new PreferenceBase(
                        resultSet.getObject("user_id", UUID.class),
                        resultSet.getObject("budget_per_person", Integer.class),
                        resultSet.getObject("activity_level", Integer.class),
                        resultSet.getObject("travel_tolerance", Integer.class)
                ))
                .list();
        if (bases.isEmpty() || bases.stream().anyMatch(PreferenceBase::incomplete)) {
            return List.of();
        }

        List<ProposalMemberPreference> preferences = new ArrayList<>();
        for (PreferenceBase base : bases) {
            List<PreferenceCategory> categories = jdbcClient.sql("""
                            select category
                            from public.private_preference_category
                            where trip_id = :tripId
                              and user_id = :userId
                            order by selection_order
                            """)
                    .param("tripId", tripId)
                    .param("userId", base.userId())
                    .query(String.class)
                    .list()
                    .stream()
                    .map(PreferenceCategory::valueOf)
                    .toList();
            if (categories.isEmpty()) {
                return List.of();
            }
            jdbcClient.sql("""
                            insert into public.concession_ledger (trip_id, user_id)
                            values (:tripId, :userId)
                            on conflict (trip_id, user_id) do nothing
                            """)
                    .param("tripId", tripId)
                    .param("userId", base.userId())
                    .update();
            BigDecimal concessionScore = jdbcClient.sql("""
                            select score
                            from public.concession_ledger
                            where trip_id = :tripId
                              and user_id = :userId
                            """)
                    .param("tripId", tripId)
                    .param("userId", base.userId())
                    .query(BigDecimal.class)
                    .single();
            preferences.add(new ProposalMemberPreference(
                    base.userId(),
                    base.budgetPerPerson(),
                    base.activityLevel(),
                    base.travelTolerance(),
                    categories,
                    concessionScore
            ));
        }
        return List.copyOf(preferences);
    }

    private List<ProposalCandidate> validCandidates(List<ProposalCandidate> candidates) {
        if (candidates == null) {
            throw new ProposalCandidateException("후보 어댑터가 null을 반환했습니다.");
        }
        TreeMap<String, ProposalCandidate> unique = new TreeMap<>();
        candidates.stream()
                .filter(ProposalCandidate::verifiedOpen)
                .filter(this::isInDaejeon)
                .sorted(Comparator.comparing(ProposalCandidate::sourceCandidateId))
                .forEach(candidate -> unique.putIfAbsent(
                        candidate.sourceCandidateId(),
                        candidate
                ));
        return List.copyOf(unique.values());
    }

    private boolean isInDaejeon(ProposalCandidate candidate) {
        return candidate.latitude().compareTo(DAEJEON_MIN_LATITUDE) >= 0
                && candidate.latitude().compareTo(DAEJEON_MAX_LATITUDE) <= 0
                && candidate.longitude().compareTo(DAEJEON_MIN_LONGITUDE) >= 0
                && candidate.longitude().compareTo(DAEJEON_MAX_LONGITUDE) <= 0;
    }

    private void insertProposal(
            JdbcClient jdbcClient,
            GenerationContext context,
            ScoredProposalCandidate scored,
            int rank
    ) {
        ProposalCandidate candidate = scored.candidate();
        UUID proposalId = UUID.randomUUID();
        jdbcClient.sql("""
                        insert into public.proposal (
                            id,
                            proposal_set_id,
                            source_candidate_id,
                            rank,
                            title,
                            summary,
                            starts_at,
                            ends_at,
                            place_name,
                            address,
                            latitude,
                            longitude,
                            indoor,
                            category,
                            expected_cost,
                            total_travel_minutes,
                            minimum_member_satisfaction,
                            weighted_average_satisfaction
                        )
                        values (
                            :id,
                            :proposalSetId,
                            :sourceCandidateId,
                            :rank,
                            :title,
                            :summary,
                            :startsAt,
                            :endsAt,
                            :placeName,
                            :address,
                            :latitude,
                            :longitude,
                            :indoor,
                            :category,
                            :expectedCost,
                            :travelMinutes,
                            :minimumSatisfaction,
                            :weightedAverage
                        )
                        """)
                .param("id", proposalId)
                .param("proposalSetId", context.proposalSetId())
                .param("sourceCandidateId", candidate.sourceCandidateId())
                .param("rank", rank)
                .param("title", candidate.placeName() + "로 변경")
                .param("summary", "%s · 예상 비용 %,d원 · 이동 %d분"
                        .formatted(
                                candidate.address(),
                                candidate.expectedCost(),
                                candidate.totalTravelMinutes()
                        ))
                .param("startsAt", Timestamp.from(context.startsAt()))
                .param("endsAt", Timestamp.from(context.endsAt()))
                .param("placeName", candidate.placeName())
                .param("address", candidate.address())
                .param("latitude", candidate.latitude())
                .param("longitude", candidate.longitude())
                .param("indoor", candidate.indoor())
                .param("category", candidate.category().name())
                .param("expectedCost", candidate.expectedCost())
                .param("travelMinutes", candidate.totalTravelMinutes())
                .param("minimumSatisfaction", scored.minimumMemberSatisfaction())
                .param("weightedAverage", scored.weightedAverageSatisfaction())
                .update();
        for (ProposalMemberScore score : scored.memberScores()) {
            jdbcClient.sql("""
                            insert into public.proposal_member_score (
                                proposal_id,
                                user_id,
                                category_match,
                                budget_fit,
                                travel_fit,
                                activity_fit,
                                utility,
                                concession_weight
                            )
                            values (
                                :proposalId,
                                :userId,
                                :categoryMatch,
                                :budgetFit,
                                :travelFit,
                                :activityFit,
                                :utility,
                                :concessionWeight
                            )
                            """)
                    .param("proposalId", proposalId)
                    .param("userId", score.userId())
                    .param("categoryMatch", score.categoryMatch())
                    .param("budgetFit", score.budgetFit())
                    .param("travelFit", score.travelFit())
                    .param("activityFit", score.activityFit())
                    .param("utility", score.utility())
                    .param("concessionWeight", score.concessionWeight())
                    .update();
        }
    }

    private void finishWithoutCandidates(
            JdbcClient jdbcClient,
            GenerationContext context,
            ProposalSetStatus status,
            String failureCode
    ) {
        jdbcClient.sql("""
                        update public.proposal_set
                        set status = :status,
                            failure_code = :failureCode,
                            completed_at = current_timestamp,
                            updated_at = current_timestamp
                        where id = :id
                        """)
                .param("status", status.name())
                .param("failureCode", failureCode)
                .param("id", context.proposalSetId())
                .update();
        jdbcClient.sql("""
                        update public.disruption
                        set status = 'FAILED',
                            updated_at = current_timestamp
                        where id = :id
                        """)
                .param("id", context.disruptionId())
                .update();
    }

    private void updateSnapshotHash(
            JdbcClient jdbcClient,
            UUID proposalSetId,
            String snapshotHash
    ) {
        jdbcClient.sql("""
                        update public.proposal_set
                        set input_snapshot_hash = :snapshotHash,
                            updated_at = current_timestamp
                        where id = :id
                        """)
                .param("snapshotHash", snapshotHash)
                .param("id", proposalSetId)
                .update();
    }

    private String snapshotHash(
            UUID itineraryVersionId,
            List<ProposalMemberPreference> preferences
    ) {
        StringBuilder material = new StringBuilder(itineraryVersionId.toString());
        for (ProposalMemberPreference preference : preferences) {
            material.append('\n')
                    .append(preference.userId()).append('|')
                    .append(preference.budgetPerPerson()).append('|')
                    .append(preference.activityLevel()).append('|')
                    .append(preference.travelTolerance()).append('|')
                    .append(preference.preferredCategories()).append('|')
                    .append(preference.concessionScore());
        }
        return sha256(material.toString());
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

    private JdbcClient requireJdbcClient() {
        JdbcClient jdbcClient = jdbcClientProvider.getIfAvailable();
        if (jdbcClient == null) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "PROPOSAL_STORE_UNAVAILABLE",
                    "후보 저장소가 구성되지 않았습니다."
            );
        }
        return jdbcClient;
    }

    private record GenerationContext(
            UUID proposalSetId,
            UUID disruptionId,
            UUID tripId,
            UUID itineraryVersionId,
            ProposalSetStatus status,
            int candidateLimit,
            UUID slotId,
            Instant startsAt,
            Instant endsAt,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
    }

    private record GenerationPreparation(
            GenerationContext context,
            List<ProposalMemberPreference> preferences,
            ProposalSetResponse response
    ) {
        static GenerationPreparation ready(
                GenerationContext context,
                List<ProposalMemberPreference> preferences
        ) {
            return new GenerationPreparation(context, preferences, null);
        }

        static GenerationPreparation finished(ProposalSetResponse response) {
            return new GenerationPreparation(null, List.of(), response);
        }

        boolean ready() {
            return response == null;
        }
    }

    private record PreferenceBase(
            UUID userId,
            Integer budgetPerPerson,
            Integer activityLevel,
            Integer travelTolerance
    ) {
        boolean incomplete() {
            return budgetPerPerson == null
                    || activityLevel == null
                    || travelTolerance == null;
        }
    }
}
