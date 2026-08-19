package com.chungnamdevelopers.dajeong.api.proposal;

import com.chungnamdevelopers.dajeong.api.itinerary.ItineraryCategory;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProposalResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int rank,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String title,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String summary,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant startsAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant endsAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String placeName,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String address,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) BigDecimal latitude,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) BigDecimal longitude,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean indoor,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ItineraryCategory category,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int expectedCost,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int totalTravelMinutes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) BigDecimal minimumMemberSatisfaction,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) BigDecimal weightedAverageSatisfaction,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int voteCount
) {
}
