package com.chungnamdevelopers.dajeong.api.proposal;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProposalSearchRequest(
        UUID proposalSetId,
        UUID tripId,
        UUID itineraryVersionId,
        UUID disruptedSlotId,
        Instant startsAt,
        Instant endsAt,
        BigDecimal latitude,
        BigDecimal longitude
) {
}
