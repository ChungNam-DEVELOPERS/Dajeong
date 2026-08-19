package com.chungnamdevelopers.dajeong.api.proposal;

import java.math.BigDecimal;
import java.util.UUID;

record ProposalMemberScore(
        UUID userId,
        BigDecimal categoryMatch,
        BigDecimal budgetFit,
        BigDecimal travelFit,
        BigDecimal activityFit,
        BigDecimal utility,
        BigDecimal concessionWeight
) {
}
