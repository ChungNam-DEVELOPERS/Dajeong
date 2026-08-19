package com.chungnamdevelopers.dajeong.api.proposal;

import java.math.BigDecimal;
import java.util.List;

record ScoredProposalCandidate(
        ProposalCandidate candidate,
        List<ProposalMemberScore> memberScores,
        BigDecimal minimumMemberSatisfaction,
        BigDecimal weightedAverageSatisfaction
) {
}
