package com.chungnamdevelopers.dajeong.api.proposal;

import com.chungnamdevelopers.dajeong.api.disruption.DisruptionStatus;
import com.chungnamdevelopers.dajeong.api.error.ApiException;
import com.chungnamdevelopers.dajeong.api.identity.CurrentUserResponse;
import com.chungnamdevelopers.dajeong.api.itinerary.ItineraryCategory;
import com.chungnamdevelopers.dajeong.api.trip.TripStatus;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProposalService {

    private static final int MAX_IDEMPOTENCY_KEY_LENGTH = 200;

    private final ObjectProvider<JdbcClient> jdbcClientProvider;

    public ProposalService(ObjectProvider<JdbcClient> jdbcClientProvider) {
        this.jdbcClientProvider = jdbcClientProvider;
    }

    @Transactional
    public ReplanStartResponse start(
            CurrentUserResponse currentUser,
            UUID disruptionId,
            String idempotencyKey
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        String requestKeyHash = sha256(normalizeIdempotencyKey(idempotencyKey));
        Optional<ExistingProposalRequest> existing = jdbcClient.sql("""
                        select id, disruption_id
                        from public.proposal_set
                        where requested_by_user_id = :userId
                          and request_key_hash = :requestKeyHash
                        """)
                .param("userId", currentUser.id())
                .param("requestKeyHash", requestKeyHash)
                .query((resultSet, rowNumber) -> new ExistingProposalRequest(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getObject("disruption_id", UUID.class)
                ))
                .optional();
        if (existing.isPresent()) {
            if (!existing.get().disruptionId().equals(disruptionId)) {
                throw idempotencyConflict();
            }
            requireActiveMember(jdbcClient, existing.get().proposalSetId(), currentUser.id());
            ProposalSetResponse proposalSet = loadResponse(
                    jdbcClient,
                    existing.get().proposalSetId(),
                    currentUser.id()
            );
            return new ReplanStartResponse(
                    disruptionId,
                    loadDisruptionStatus(jdbcClient, disruptionId),
                    proposalSet
            );
        }

        ReplanAccess access = requireReplanAccess(
                jdbcClient,
                disruptionId,
                currentUser.id()
        );
        if (access.tripStatus() != TripStatus.DRAFT
                && access.tripStatus() != TripStatus.ACTIVE) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "DISRUPTION_NOT_EDITABLE",
                    "완료되거나 보관된 여행에서는 재조정을 시작할 수 없습니다."
            );
        }
        if (access.disruptionStatus() != DisruptionStatus.DETECTED
                && access.disruptionStatus() != DisruptionStatus.FAILED) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "DISRUPTION_ALREADY_RESOLVED",
                    "이미 처리 중이거나 다른 방식으로 처리된 문제입니다."
            );
        }

        UUID proposalSetId = UUID.randomUUID();
        jdbcClient.sql("""
                        insert into public.disruption_action_request (
                            disruption_id,
                            request_key_hash,
                            action
                        )
                        values (:disruptionId, :requestKeyHash, 'START_REPLAN')
                        """)
                .param("disruptionId", disruptionId)
                .param("requestKeyHash", requestKeyHash)
                .update();
        jdbcClient.sql("""
                        insert into public.proposal_set (
                            id,
                            disruption_id,
                            trip_id,
                            itinerary_version_id,
                            requested_by_user_id,
                            request_key_hash
                        )
                        values (
                            :id,
                            :disruptionId,
                            :tripId,
                            :versionId,
                            :userId,
                            :requestKeyHash
                        )
                        """)
                .param("id", proposalSetId)
                .param("disruptionId", disruptionId)
                .param("tripId", access.tripId())
                .param("versionId", access.itineraryVersionId())
                .param("userId", currentUser.id())
                .param("requestKeyHash", requestKeyHash)
                .update();
        jdbcClient.sql("""
                        update public.disruption
                        set status = 'ACKNOWLEDGED',
                            updated_at = current_timestamp
                        where id = :disruptionId
                        """)
                .param("disruptionId", disruptionId)
                .update();
        return new ReplanStartResponse(
                disruptionId,
                DisruptionStatus.ACKNOWLEDGED,
                loadResponse(jdbcClient, proposalSetId, currentUser.id())
        );
    }

    @Transactional(readOnly = true)
    public ProposalSetResponse get(
            CurrentUserResponse currentUser,
            UUID proposalSetId
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        requireActiveMember(jdbcClient, proposalSetId, currentUser.id());
        return loadResponse(jdbcClient, proposalSetId, currentUser.id());
    }

    ProposalSetResponse loadResponse(JdbcClient jdbcClient, UUID proposalSetId) {
        return loadResponse(jdbcClient, proposalSetId, null);
    }

    ProposalSetResponse loadResponse(
            JdbcClient jdbcClient,
            UUID proposalSetId,
            UUID currentUserId
    ) {
        ProposalSetRow set = jdbcClient.sql("""
                        select
                            ps.id,
                            ps.disruption_id,
                            ps.trip_id,
                            ps.itinerary_version_id,
                            ps.status,
                            ps.candidate_limit,
                            ps.shortage_reason,
                            ps.failure_code,
                            ps.voting_opened_at,
                            ps.voting_deadline_at,
                            ps.winner_proposal_id,
                            ps.applied_itinerary_version_id,
                            ps.closing_reason,
                            ps.closed_at,
                            ps.applied_at,
                            ps.created_at,
                            ps.started_at,
                            ps.completed_at,
                            ps.updated_at,
                            (
                                select count(distinct pms.user_id)
                                from public.proposal p
                                join public.proposal_member_score pms
                                  on pms.proposal_id = p.id
                                join public.trip_membership m
                                  on m.trip_id = ps.trip_id
                                 and m.user_id = pms.user_id
                                  and m.status = 'ACTIVE'
                                where p.proposal_set_id = ps.id
                            ) as eligible_member_count,
                            (
                                select count(*)
                                from public.vote v
                                join public.trip_membership m
                                  on m.trip_id = ps.trip_id
                                 and m.user_id = v.user_id
                                 and m.status = 'ACTIVE'
                                where v.proposal_set_id = ps.id
                                  and exists (
                                      select 1
                                      from public.proposal p
                                      join public.proposal_member_score pms
                                        on pms.proposal_id = p.id
                                       and pms.user_id = v.user_id
                                      where p.proposal_set_id = ps.id
                                  )
                            ) as participant_count
                        from public.proposal_set ps
                        where ps.id = :id
                        """)
                .param("id", proposalSetId)
                .query((resultSet, rowNumber) -> new ProposalSetRow(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getObject("disruption_id", UUID.class),
                        resultSet.getObject("trip_id", UUID.class),
                        resultSet.getObject("itinerary_version_id", UUID.class),
                        ProposalSetStatus.valueOf(resultSet.getString("status")),
                        resultSet.getInt("candidate_limit"),
                        resultSet.getString("shortage_reason"),
                        resultSet.getString("failure_code"),
                        nullableInstant(resultSet.getObject(
                                "voting_opened_at",
                                Timestamp.class
                        )),
                        nullableInstant(resultSet.getObject(
                                "voting_deadline_at",
                                Timestamp.class
                        )),
                        resultSet.getObject("winner_proposal_id", UUID.class),
                        resultSet.getObject("applied_itinerary_version_id", UUID.class),
                        resultSet.getString("closing_reason") == null
                                ? null
                                : VoteClosingReason.valueOf(
                                        resultSet.getString("closing_reason")
                                ),
                        nullableInstant(resultSet.getObject("closed_at", Timestamp.class)),
                        nullableInstant(resultSet.getObject("applied_at", Timestamp.class)),
                        resultSet.getObject("created_at", Timestamp.class).toInstant(),
                        nullableInstant(resultSet.getObject("started_at", Timestamp.class)),
                        nullableInstant(resultSet.getObject("completed_at", Timestamp.class)),
                        resultSet.getObject("updated_at", Timestamp.class).toInstant(),
                        resultSet.getInt("eligible_member_count"),
                        resultSet.getInt("participant_count")
                ))
                .optional()
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "PROPOSAL_SET_NOT_FOUND",
                        "후보 작업을 찾을 수 없습니다."
                ));
        List<ProposalResponse> proposals = jdbcClient.sql("""
                        select
                            p.id,
                            p.rank,
                            p.title,
                            p.summary,
                            p.starts_at,
                            p.ends_at,
                            p.place_name,
                            p.address,
                            p.latitude,
                            p.longitude,
                            p.indoor,
                            p.category,
                            p.expected_cost,
                            p.total_travel_minutes,
                            p.minimum_member_satisfaction,
                            p.weighted_average_satisfaction,
                            (
                                select count(*)
                                from public.vote v
                                join public.trip_membership m
                                  on m.trip_id = ps.trip_id
                                 and m.user_id = v.user_id
                                 and m.status = 'ACTIVE'
                                where v.proposal_set_id = p.proposal_set_id
                                  and v.proposal_id = p.id
                                  and exists (
                                      select 1
                                      from public.proposal_member_score pms
                                      where pms.proposal_id = p.id
                                        and pms.user_id = v.user_id
                                  )
                            ) as vote_count
                        from public.proposal p
                        join public.proposal_set ps
                          on ps.id = p.proposal_set_id
                        where p.proposal_set_id = :proposalSetId
                        order by p.rank
                        """)
                .param("proposalSetId", proposalSetId)
                .query((resultSet, rowNumber) -> new ProposalResponse(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getInt("rank"),
                        resultSet.getString("title"),
                        resultSet.getString("summary"),
                        resultSet.getObject("starts_at", Timestamp.class).toInstant(),
                        resultSet.getObject("ends_at", Timestamp.class).toInstant(),
                        resultSet.getString("place_name"),
                        resultSet.getString("address"),
                        resultSet.getBigDecimal("latitude"),
                        resultSet.getBigDecimal("longitude"),
                        resultSet.getBoolean("indoor"),
                        ItineraryCategory.valueOf(resultSet.getString("category")),
                        resultSet.getInt("expected_cost"),
                        resultSet.getInt("total_travel_minutes"),
                        resultSet.getBigDecimal("minimum_member_satisfaction"),
                        resultSet.getBigDecimal("weighted_average_satisfaction"),
                        resultSet.getInt("vote_count")
                ))
                .list();
        UUID myVoteProposalId = currentUserId == null
                ? null
                : jdbcClient.sql("""
                                select proposal_id
                                from public.vote
                                where proposal_set_id = :proposalSetId
                                  and user_id = :userId
                                """)
                        .param("proposalSetId", proposalSetId)
                        .param("userId", currentUserId)
                        .query(UUID.class)
                        .optional()
                        .orElse(null);
        return new ProposalSetResponse(
                set.id(),
                set.disruptionId(),
                set.tripId(),
                set.itineraryVersionId(),
                set.status(),
                set.candidateLimit(),
                proposals.size(),
                set.eligibleMemberCount(),
                set.participantCount(),
                myVoteProposalId,
                set.shortageReason(),
                set.failureCode(),
                set.votingOpenedAt(),
                set.votingDeadlineAt(),
                set.winnerProposalId(),
                set.appliedItineraryVersionId(),
                set.closingReason(),
                set.closedAt(),
                set.appliedAt(),
                set.createdAt(),
                set.startedAt(),
                set.completedAt(),
                set.updatedAt(),
                proposals
        );
    }

    private ReplanAccess requireReplanAccess(
            JdbcClient jdbcClient,
            UUID disruptionId,
            UUID userId
    ) {
        return jdbcClient.sql("""
                        select
                            d.trip_id,
                            d.itinerary_version_id,
                            d.status as disruption_status,
                            t.status as trip_status
                        from public.disruption d
                        join public.trip t
                          on t.id = d.trip_id
                        join public.trip_membership m
                          on m.trip_id = d.trip_id
                         and m.user_id = :userId
                         and m.status = 'ACTIVE'
                        where d.id = :disruptionId
                        for update of d, t, m
                        """)
                .param("disruptionId", disruptionId)
                .param("userId", userId)
                .query((resultSet, rowNumber) -> new ReplanAccess(
                        resultSet.getObject("trip_id", UUID.class),
                        resultSet.getObject("itinerary_version_id", UUID.class),
                        DisruptionStatus.valueOf(resultSet.getString("disruption_status")),
                        TripStatus.valueOf(resultSet.getString("trip_status"))
                ))
                .optional()
                .orElseThrow(this::forbidden);
    }

    private void requireActiveMember(
            JdbcClient jdbcClient,
            UUID proposalSetId,
            UUID userId
    ) {
        boolean exists = jdbcClient.sql("""
                        select exists (
                            select 1
                            from public.proposal_set ps
                            join public.trip_membership m
                              on m.trip_id = ps.trip_id
                             and m.user_id = :userId
                             and m.status = 'ACTIVE'
                            where ps.id = :proposalSetId
                        )
                        """)
                .param("proposalSetId", proposalSetId)
                .param("userId", userId)
                .query(Boolean.class)
                .single();
        if (!exists) {
            throw forbidden();
        }
    }

    private DisruptionStatus loadDisruptionStatus(
            JdbcClient jdbcClient,
            UUID disruptionId
    ) {
        return jdbcClient.sql("""
                        select status
                        from public.disruption
                        where id = :id
                        """)
                .param("id", disruptionId)
                .query(String.class)
                .optional()
                .map(DisruptionStatus::valueOf)
                .orElseThrow(this::forbidden);
    }

    private String normalizeIdempotencyKey(String value) {
        if (value == null || value.isBlank()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "IDEMPOTENCY_KEY_REQUIRED",
                    "Idempotency-Key가 필요합니다."
            );
        }
        String normalized = value.strip();
        if (normalized.length() > MAX_IDEMPOTENCY_KEY_LENGTH) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "IDEMPOTENCY_KEY_TOO_LONG",
                    "Idempotency-Key는 200자를 넘을 수 없습니다."
            );
        }
        return normalized;
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

    private Instant nullableInstant(Timestamp value) {
        return value == null ? null : value.toInstant();
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

    private ApiException forbidden() {
        return new ApiException(
                HttpStatus.FORBIDDEN,
                "PROPOSAL_FORBIDDEN",
                "이 여행의 후보 작업을 볼 권한이 없습니다."
        );
    }

    private ApiException idempotencyConflict() {
        return new ApiException(
                HttpStatus.CONFLICT,
                "IDEMPOTENCY_KEY_REUSED",
                "같은 Idempotency-Key가 다른 재조정 요청에 사용되었습니다."
        );
    }

    private record ExistingProposalRequest(UUID proposalSetId, UUID disruptionId) {
    }

    private record ReplanAccess(
            UUID tripId,
            UUID itineraryVersionId,
            DisruptionStatus disruptionStatus,
            TripStatus tripStatus
    ) {
    }

    private record ProposalSetRow(
            UUID id,
            UUID disruptionId,
            UUID tripId,
            UUID itineraryVersionId,
            ProposalSetStatus status,
            int candidateLimit,
            String shortageReason,
            String failureCode,
            Instant votingOpenedAt,
            Instant votingDeadlineAt,
            UUID winnerProposalId,
            UUID appliedItineraryVersionId,
            VoteClosingReason closingReason,
            Instant closedAt,
            Instant appliedAt,
            Instant createdAt,
            Instant startedAt,
            Instant completedAt,
            Instant updatedAt,
            int eligibleMemberCount,
            int participantCount
    ) {
    }
}
