package com.chungnamdevelopers.dajeong.api.proposal;

import com.chungnamdevelopers.dajeong.api.error.ApiException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;

@Service
public class VoteFinalizationService {

    private static final int MAX_DEADLINE_BATCH_SIZE = 100;

    private final ObjectProvider<JdbcClient> jdbcClientProvider;
    private final ObjectProvider<PlatformTransactionManager> transactionManagerProvider;
    private final ProposalService proposalService;

    public VoteFinalizationService(
            ObjectProvider<JdbcClient> jdbcClientProvider,
            ObjectProvider<PlatformTransactionManager> transactionManagerProvider,
            ProposalService proposalService
    ) {
        this.jdbcClientProvider = jdbcClientProvider;
        this.transactionManagerProvider = transactionManagerProvider;
        this.proposalService = proposalService;
    }

    ProposalSetResponse finalizeWhenComplete(
            UUID proposalSetId,
            UUID currentUserId,
            Instant now
    ) {
        return inTransaction(jdbcClient -> finalizeSet(
                jdbcClient,
                proposalSetId,
                currentUserId,
                VoteClosingReason.ALL_MEMBERS_VOTED,
                now
        ));
    }

    public VoteDeadlineBatchResult closeDue(Instant now, int batchSize) {
        Objects.requireNonNull(now, "마감 기준 시각");
        if (batchSize < 1 || batchSize > MAX_DEADLINE_BATCH_SIZE) {
            throw new IllegalArgumentException("마감 배치 크기는 1~100이어야 합니다.");
        }
        JdbcClient jdbcClient = requireJdbcClient();
        List<UUID> dueProposalSetIds = jdbcClient.sql("""
                        select id
                        from public.proposal_set
                        where status = 'OPEN'
                          and voting_deadline_at <= :now
                        order by voting_deadline_at, id
                        limit :batchSize
                        """)
                .param("now", Timestamp.from(now))
                .param("batchSize", batchSize)
                .query(UUID.class)
                .list();

        int appliedCount = 0;
        int cancelledCount = 0;
        for (UUID proposalSetId : dueProposalSetIds) {
            ProposalSetResponse response = inTransaction(innerJdbcClient -> finalizeSet(
                    innerJdbcClient,
                    proposalSetId,
                    null,
                    VoteClosingReason.DEADLINE,
                    now
            ));
            if (response.status() == ProposalSetStatus.APPLIED) {
                appliedCount++;
            } else if (response.status() == ProposalSetStatus.CANCELLED) {
                cancelledCount++;
            }
        }
        return new VoteDeadlineBatchResult(
                dueProposalSetIds.size(),
                appliedCount,
                cancelledCount
        );
    }

    private ProposalSetResponse finalizeSet(
            JdbcClient jdbcClient,
            UUID proposalSetId,
            UUID currentUserId,
            VoteClosingReason closingReason,
            Instant now
    ) {
        FinalizationContext context = lockContext(jdbcClient, proposalSetId);
        if (context.status() != ProposalSetStatus.OPEN) {
            return proposalService.loadResponse(
                    jdbcClient,
                    proposalSetId,
                    currentUserId
            );
        }
        if (closingReason == VoteClosingReason.ALL_MEMBERS_VOTED
                && (context.eligibleMemberCount() == 0
                || context.participantCount() < context.eligibleMemberCount())) {
            return proposalService.loadResponse(
                    jdbcClient,
                    proposalSetId,
                    currentUserId
            );
        }
        if (closingReason == VoteClosingReason.DEADLINE
                && (context.votingDeadlineAt() == null
                || context.votingDeadlineAt().isAfter(now))) {
            return proposalService.loadResponse(
                    jdbcClient,
                    proposalSetId,
                    currentUserId
            );
        }

        VersionPointer currentVersion = loadCurrentVersion(
                jdbcClient,
                context.tripId()
        );
        if (!currentVersion.id().equals(context.itineraryVersionId())) {
            cancel(
                    jdbcClient,
                    context,
                    closingReason,
                    now,
                    "STALE_ITINERARY"
            );
            return proposalService.loadResponse(
                    jdbcClient,
                    proposalSetId,
                    currentUserId
            );
        }

        WinningProposal winner = loadWinner(jdbcClient, context);
        if (winner == null || winner.voteCount() == 0) {
            cancel(jdbcClient, context, closingReason, now, "NO_VOTES");
            return proposalService.loadResponse(
                    jdbcClient,
                    proposalSetId,
                    currentUserId
            );
        }

        markClosed(jdbcClient, context, winner.id(), closingReason, now);
        UUID appliedVersionId = UUID.randomUUID();
        insertVersion(
                jdbcClient,
                context,
                currentVersion,
                appliedVersionId,
                now
        );
        copySlotsWithWinner(
                jdbcClient,
                context,
                winner.id(),
                appliedVersionId
        );
        updateConcessionLedger(jdbcClient, context, winner.id(), now);
        markApplied(jdbcClient, context, appliedVersionId, now);
        createAppliedNotifications(jdbcClient, context, appliedVersionId, now);
        return proposalService.loadResponse(
                jdbcClient,
                proposalSetId,
                currentUserId
        );
    }

    private FinalizationContext lockContext(
            JdbcClient jdbcClient,
            UUID proposalSetId
    ) {
        return jdbcClient.sql("""
                        select
                            ps.id,
                            ps.disruption_id,
                            ps.trip_id,
                            ps.itinerary_version_id,
                            ps.requested_by_user_id,
                            ps.status,
                            ps.voting_deadline_at,
                            d.itinerary_slot_id,
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
                        join public.disruption d
                          on d.id = ps.disruption_id
                        join public.trip t
                          on t.id = ps.trip_id
                        where ps.id = :proposalSetId
                        for update of ps, d, t
                        """)
                .param("proposalSetId", proposalSetId)
                .query((resultSet, rowNumber) -> new FinalizationContext(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getObject("disruption_id", UUID.class),
                        resultSet.getObject("trip_id", UUID.class),
                        resultSet.getObject("itinerary_version_id", UUID.class),
                        resultSet.getObject("requested_by_user_id", UUID.class),
                        resultSet.getObject("itinerary_slot_id", UUID.class),
                        ProposalSetStatus.valueOf(resultSet.getString("status")),
                        nullableInstant(resultSet.getObject(
                                "voting_deadline_at",
                                Timestamp.class
                        )),
                        resultSet.getInt("eligible_member_count"),
                        resultSet.getInt("participant_count")
                ))
                .optional()
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "PROPOSAL_SET_NOT_FOUND",
                        "후보 작업을 찾을 수 없습니다."
                ));
    }

    private VersionPointer loadCurrentVersion(
            JdbcClient jdbcClient,
            UUID tripId
    ) {
        return jdbcClient.sql("""
                        select id, version_number, draft_revision
                        from public.itinerary_version
                        where trip_id = :tripId
                        order by version_number desc
                        limit 1
                        """)
                .param("tripId", tripId)
                .query((resultSet, rowNumber) -> new VersionPointer(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getInt("version_number"),
                        resultSet.getLong("draft_revision")
                ))
                .optional()
                .orElseThrow(() -> new ApiException(
                        HttpStatus.CONFLICT,
                        "ITINERARY_NOT_PUBLISHED",
                        "발행된 일정이 없어 투표 결과를 적용할 수 없습니다."
                ));
    }

    private WinningProposal loadWinner(
            JdbcClient jdbcClient,
            FinalizationContext context
    ) {
        return jdbcClient.sql("""
                        select
                            p.id,
                            count(m.user_id) as vote_count
                        from public.proposal p
                        left join public.vote v
                          on v.proposal_set_id = p.proposal_set_id
                         and v.proposal_id = p.id
                        left join public.trip_membership m
                          on m.trip_id = :tripId
                         and m.user_id = v.user_id
                         and m.status = 'ACTIVE'
                         and exists (
                             select 1
                             from public.proposal_member_score pms
                             where pms.proposal_id = p.id
                               and pms.user_id = v.user_id
                         )
                        where p.proposal_set_id = :proposalSetId
                        group by p.id, p.rank
                        order by vote_count desc, p.rank, p.id
                        limit 1
                        """)
                .param("tripId", context.tripId())
                .param("proposalSetId", context.proposalSetId())
                .query((resultSet, rowNumber) -> new WinningProposal(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getInt("vote_count")
                ))
                .optional()
                .orElse(null);
    }

    private void cancel(
            JdbcClient jdbcClient,
            FinalizationContext context,
            VoteClosingReason closingReason,
            Instant now,
            String failureCode
    ) {
        jdbcClient.sql("""
                        update public.proposal_set
                        set status = 'CANCELLED',
                            failure_code = :failureCode,
                            closing_reason = :closingReason,
                            closed_at = :closedAt,
                            updated_at = :closedAt
                        where id = :proposalSetId
                        """)
                .param("failureCode", failureCode)
                .param("closingReason", closingReason.name())
                .param("closedAt", Timestamp.from(now))
                .param("proposalSetId", context.proposalSetId())
                .update();
        jdbcClient.sql("""
                        update public.disruption
                        set status = 'DISMISSED',
                            updated_at = :closedAt
                        where id = :disruptionId
                        """)
                .param("closedAt", Timestamp.from(now))
                .param("disruptionId", context.disruptionId())
                .update();
    }

    private void markClosed(
            JdbcClient jdbcClient,
            FinalizationContext context,
            UUID winnerProposalId,
            VoteClosingReason closingReason,
            Instant now
    ) {
        jdbcClient.sql("""
                        update public.proposal_set
                        set status = 'CLOSED',
                            winner_proposal_id = :winnerProposalId,
                            closing_reason = :closingReason,
                            closed_at = :closedAt,
                            updated_at = :closedAt
                        where id = :proposalSetId
                        """)
                .param("winnerProposalId", winnerProposalId)
                .param("closingReason", closingReason.name())
                .param("closedAt", Timestamp.from(now))
                .param("proposalSetId", context.proposalSetId())
                .update();
    }

    private void insertVersion(
            JdbcClient jdbcClient,
            FinalizationContext context,
            VersionPointer currentVersion,
            UUID versionId,
            Instant now
    ) {
        jdbcClient.sql("""
                        insert into public.itinerary_version (
                            id,
                            trip_id,
                            version_number,
                            reason,
                            previous_version_id,
                            draft_revision,
                            published_by_user_id,
                            publish_request_key_hash,
                            published_at
                        )
                        values (
                            :versionId,
                            :tripId,
                            :versionNumber,
                            'REPLAN',
                            :previousVersionId,
                            :draftRevision,
                            :publishedByUserId,
                            :requestKeyHash,
                            :publishedAt
                        )
                        """)
                .param("versionId", versionId)
                .param("tripId", context.tripId())
                .param("versionNumber", currentVersion.versionNumber() + 1)
                .param("previousVersionId", currentVersion.id())
                .param("draftRevision", currentVersion.draftRevision())
                .param("publishedByUserId", context.requestedByUserId())
                .param("requestKeyHash", sha256(
                        "replan:" + context.proposalSetId()
                ))
                .param("publishedAt", Timestamp.from(now))
                .update();
    }

    private void copySlotsWithWinner(
            JdbcClient jdbcClient,
            FinalizationContext context,
            UUID winnerProposalId,
            UUID versionId
    ) {
        SlotCopyExpectation expectation = jdbcClient.sql("""
                        select
                            count(*) as slot_count,
                            count(*) filter (
                                where id = :affectedSlotId
                            ) as affected_slot_count
                        from public.itinerary_slot
                        where itinerary_version_id = :sourceVersionId
                        """)
                .param("affectedSlotId", context.itinerarySlotId())
                .param("sourceVersionId", context.itineraryVersionId())
                .query((resultSet, rowNumber) -> new SlotCopyExpectation(
                        resultSet.getInt("slot_count"),
                        resultSet.getInt("affected_slot_count")
                ))
                .single();
        if (expectation.slotCount() == 0
                || expectation.affectedSlotCount() != 1) {
            throw new IllegalStateException("적용할 원본 일정 슬롯이 올바르지 않습니다.");
        }

        int copiedCount = jdbcClient.sql("""
                        insert into public.itinerary_slot (
                            id,
                            itinerary_version_id,
                            source_draft_slot_id,
                            starts_at,
                            ends_at,
                            place_name,
                            address,
                            latitude,
                            longitude,
                            indoor,
                            category,
                            expected_cost,
                            source
                        )
                        select
                            cast(md5(
                                cast(s.id as text) || ':' || cast(:versionId as text)
                            ) as uuid),
                            :versionId,
                            s.source_draft_slot_id,
                            case when s.id = :affectedSlotId then p.starts_at else s.starts_at end,
                            case when s.id = :affectedSlotId then p.ends_at else s.ends_at end,
                            case when s.id = :affectedSlotId then p.place_name else s.place_name end,
                            case when s.id = :affectedSlotId then p.address else s.address end,
                            case when s.id = :affectedSlotId then p.latitude else s.latitude end,
                            case when s.id = :affectedSlotId then p.longitude else s.longitude end,
                            case when s.id = :affectedSlotId then p.indoor else s.indoor end,
                            case when s.id = :affectedSlotId then p.category else s.category end,
                            case when s.id = :affectedSlotId then p.expected_cost else s.expected_cost end,
                            case when s.id = :affectedSlotId then 'REPLAN' else s.source end
                        from public.itinerary_slot s
                        cross join public.proposal p
                        where s.itinerary_version_id = :sourceVersionId
                          and p.proposal_set_id = :proposalSetId
                          and p.id = :winnerProposalId
                        """)
                .param("versionId", versionId)
                .param("affectedSlotId", context.itinerarySlotId())
                .param("sourceVersionId", context.itineraryVersionId())
                .param("proposalSetId", context.proposalSetId())
                .param("winnerProposalId", winnerProposalId)
                .update();
        if (copiedCount != expectation.slotCount()) {
            throw new IllegalStateException("확정 일정 슬롯을 모두 복사하지 못했습니다.");
        }
    }

    private void updateConcessionLedger(
            JdbcClient jdbcClient,
            FinalizationContext context,
            UUID winnerProposalId,
            Instant now
    ) {
        jdbcClient.sql("""
                        with member_regret as (
                            select
                                pms.user_id,
                                max(pms.utility) - max(
                                    case
                                        when p.id = :winnerProposalId
                                        then pms.utility
                                    end
                                ) as regret
                            from public.proposal p
                            join public.proposal_member_score pms
                              on pms.proposal_id = p.id
                            join public.trip_membership m
                              on m.trip_id = :tripId
                             and m.user_id = pms.user_id
                             and m.status = 'ACTIVE'
                            where p.proposal_set_id = :proposalSetId
                            group by pms.user_id
                        )
                        insert into public.concession_ledger (
                            trip_id,
                            user_id,
                            score,
                            updated_at
                        )
                        select
                            :tripId,
                            mr.user_id,
                            least(
                                100,
                                greatest(
                                    0,
                                    coalesce(cl.score, 0) * 0.7 + mr.regret
                                )
                            ),
                            :updatedAt
                        from member_regret mr
                        left join public.concession_ledger cl
                          on cl.trip_id = :tripId
                         and cl.user_id = mr.user_id
                        on conflict (trip_id, user_id) do update
                        set score = excluded.score,
                            updated_at = excluded.updated_at
                        """)
                .param("winnerProposalId", winnerProposalId)
                .param("tripId", context.tripId())
                .param("proposalSetId", context.proposalSetId())
                .param("updatedAt", Timestamp.from(now))
                .update();
    }

    private void markApplied(
            JdbcClient jdbcClient,
            FinalizationContext context,
            UUID appliedVersionId,
            Instant now
    ) {
        jdbcClient.sql("""
                        update public.proposal_set
                        set status = 'APPLIED',
                            applied_itinerary_version_id = :appliedVersionId,
                            failure_code = null,
                            applied_at = :appliedAt,
                            updated_at = :appliedAt
                        where id = :proposalSetId
                        """)
                .param("appliedVersionId", appliedVersionId)
                .param("appliedAt", Timestamp.from(now))
                .param("proposalSetId", context.proposalSetId())
                .update();
        jdbcClient.sql("""
                        update public.disruption
                        set status = 'APPLIED',
                            updated_at = :appliedAt
                        where id = :disruptionId
                        """)
                .param("appliedAt", Timestamp.from(now))
                .param("disruptionId", context.disruptionId())
                .update();
    }

    private void createAppliedNotifications(
            JdbcClient jdbcClient,
            FinalizationContext context,
            UUID appliedVersionId,
            Instant now
    ) {
        jdbcClient.sql("""
                        insert into public.notification (
                            id,
                            user_id,
                            trip_id,
                            type,
                            proposal_set_id,
                            itinerary_version_id,
                            created_at
                        )
                        select
                            cast(md5(
                                cast(:proposalSetId as text)
                                || ':' || cast(m.user_id as text)
                                || ':ITINERARY_REPLAN_APPLIED'
                            ) as uuid),
                            m.user_id,
                            :tripId,
                            'ITINERARY_REPLAN_APPLIED',
                            :proposalSetId,
                            :appliedVersionId,
                            :createdAt
                        from public.trip_membership m
                        where m.trip_id = :tripId
                          and m.status = 'ACTIVE'
                        on conflict (proposal_set_id, user_id, type) do nothing
                        """)
                .param("proposalSetId", context.proposalSetId())
                .param("tripId", context.tripId())
                .param("appliedVersionId", appliedVersionId)
                .param("createdAt", Timestamp.from(now))
                .update();
    }

    private <T> T inTransaction(Function<JdbcClient, T> operation) {
        JdbcClient jdbcClient = requireJdbcClient();
        PlatformTransactionManager transactionManager =
                transactionManagerProvider.getIfAvailable();
        if (transactionManager == null) {
            throw storeUnavailable();
        }
        T result = new TransactionTemplate(transactionManager)
                .execute(status -> operation.apply(jdbcClient));
        return Objects.requireNonNull(result, "투표 마감 트랜잭션 결과");
    }

    private JdbcClient requireJdbcClient() {
        JdbcClient jdbcClient = jdbcClientProvider.getIfAvailable();
        if (jdbcClient == null) {
            throw storeUnavailable();
        }
        return jdbcClient;
    }

    private ApiException storeUnavailable() {
        return new ApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "VOTE_STORE_UNAVAILABLE",
                "투표 마감 저장소가 구성되지 않았습니다."
        );
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

    private record FinalizationContext(
            UUID proposalSetId,
            UUID disruptionId,
            UUID tripId,
            UUID itineraryVersionId,
            UUID requestedByUserId,
            UUID itinerarySlotId,
            ProposalSetStatus status,
            Instant votingDeadlineAt,
            int eligibleMemberCount,
            int participantCount
    ) {
    }

    private record VersionPointer(
            UUID id,
            int versionNumber,
            long draftRevision
    ) {
    }

    private record WinningProposal(UUID id, int voteCount) {
    }

    private record SlotCopyExpectation(int slotCount, int affectedSlotCount) {
    }
}
