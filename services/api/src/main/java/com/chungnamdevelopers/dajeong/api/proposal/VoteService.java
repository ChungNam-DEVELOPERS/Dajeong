package com.chungnamdevelopers.dajeong.api.proposal;

import com.chungnamdevelopers.dajeong.api.error.ApiException;
import com.chungnamdevelopers.dajeong.api.identity.CurrentUserResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class VoteService {

    private final ObjectProvider<JdbcClient> jdbcClientProvider;
    private final ProposalService proposalService;

    public VoteService(
            ObjectProvider<JdbcClient> jdbcClientProvider,
            ProposalService proposalService
    ) {
        this.jdbcClientProvider = jdbcClientProvider;
        this.proposalService = proposalService;
    }

    @Transactional
    public ProposalSetResponse upsert(
            CurrentUserResponse currentUser,
            UUID proposalSetId,
            VoteRequest request
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        requireOpenVote(jdbcClient, proposalSetId, currentUser.id());
        requireProposalInSet(jdbcClient, proposalSetId, request.proposalId());
        jdbcClient.sql("""
                        insert into public.vote (
                            proposal_set_id,
                            user_id,
                            proposal_id
                        )
                        values (:proposalSetId, :userId, :proposalId)
                        on conflict (proposal_set_id, user_id) do update
                        set proposal_id = excluded.proposal_id,
                            updated_at = current_timestamp
                        """)
                .param("proposalSetId", proposalSetId)
                .param("userId", currentUser.id())
                .param("proposalId", request.proposalId())
                .update();
        return proposalService.loadResponse(
                jdbcClient,
                proposalSetId,
                currentUser.id()
        );
    }

    @Transactional
    public ProposalSetResponse withdraw(
            CurrentUserResponse currentUser,
            UUID proposalSetId
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        requireOpenVote(jdbcClient, proposalSetId, currentUser.id());
        jdbcClient.sql("""
                        delete from public.vote
                        where proposal_set_id = :proposalSetId
                          and user_id = :userId
                        """)
                .param("proposalSetId", proposalSetId)
                .param("userId", currentUser.id())
                .update();
        return proposalService.loadResponse(
                jdbcClient,
                proposalSetId,
                currentUser.id()
        );
    }

    private void requireOpenVote(
            JdbcClient jdbcClient,
            UUID proposalSetId,
            UUID userId
    ) {
        VoteAccess access = jdbcClient.sql("""
                        select
                            ps.status,
                            ps.voting_opened_at is not null
                                and ps.voting_deadline_at > current_timestamp
                                as within_voting_window
                        from public.proposal_set ps
                        join public.trip_membership m
                          on m.trip_id = ps.trip_id
                         and m.user_id = :userId
                         and m.status = 'ACTIVE'
                        where ps.id = :proposalSetId
                        for update of ps
                        """)
                .param("proposalSetId", proposalSetId)
                .param("userId", userId)
                .query((resultSet, rowNumber) -> new VoteAccess(
                        ProposalSetStatus.valueOf(resultSet.getString("status")),
                        resultSet.getBoolean("within_voting_window")
                ))
                .optional()
                .orElseThrow(() -> new ApiException(
                        HttpStatus.FORBIDDEN,
                        "PROPOSAL_FORBIDDEN",
                        "이 여행의 후보에 투표할 권한이 없습니다."
                ));
        if (access.status() != ProposalSetStatus.OPEN
                || !access.withinVotingWindow()) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "VOTE_CLOSED",
                    "투표할 수 있는 시간이 아니거나 이미 마감된 후보입니다."
            );
        }
    }

    private void requireProposalInSet(
            JdbcClient jdbcClient,
            UUID proposalSetId,
            UUID proposalId
    ) {
        boolean exists = jdbcClient.sql("""
                        select exists (
                            select 1
                            from public.proposal
                            where proposal_set_id = :proposalSetId
                              and id = :proposalId
                        )
                        """)
                .param("proposalSetId", proposalSetId)
                .param("proposalId", proposalId)
                .query(Boolean.class)
                .single();
        if (!exists) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "PROPOSAL_NOT_IN_SET",
                    "선택한 후보가 이 투표에 속하지 않습니다."
            );
        }
    }

    private JdbcClient requireJdbcClient() {
        JdbcClient jdbcClient = jdbcClientProvider.getIfAvailable();
        if (jdbcClient == null) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "VOTE_STORE_UNAVAILABLE",
                    "투표 저장소가 구성되지 않았습니다."
            );
        }
        return jdbcClient;
    }

    private record VoteAccess(
            ProposalSetStatus status,
            boolean withinVotingWindow
    ) {
    }
}
