package com.chungnamdevelopers.dajeong.api.proposal;

import com.chungnamdevelopers.dajeong.api.itinerary.ItineraryCategory;

import java.math.BigDecimal;
import java.util.Objects;

public record ProposalCandidate(
        String sourceCandidateId,
        String placeName,
        String address,
        BigDecimal latitude,
        BigDecimal longitude,
        boolean indoor,
        ItineraryCategory category,
        int expectedCost,
        int totalTravelMinutes,
        int activityLevel,
        boolean verifiedOpen
) {
    public ProposalCandidate {
        Objects.requireNonNull(sourceCandidateId, "sourceCandidateId");
        Objects.requireNonNull(placeName, "placeName");
        Objects.requireNonNull(address, "address");
        Objects.requireNonNull(latitude, "latitude");
        Objects.requireNonNull(longitude, "longitude");
        Objects.requireNonNull(category, "category");
        if (sourceCandidateId.isBlank() || sourceCandidateId.length() > 120) {
            throw new IllegalArgumentException("후보 식별자는 1~120자여야 합니다.");
        }
        if (placeName.isBlank() || placeName.length() > 120) {
            throw new IllegalArgumentException("후보 장소명은 1~120자여야 합니다.");
        }
        if (address.isBlank() || address.length() > 240) {
            throw new IllegalArgumentException("후보 주소는 1~240자여야 합니다.");
        }
        if (latitude.compareTo(BigDecimal.valueOf(-90)) < 0
                || latitude.compareTo(BigDecimal.valueOf(90)) > 0
                || longitude.compareTo(BigDecimal.valueOf(-180)) < 0
                || longitude.compareTo(BigDecimal.valueOf(180)) > 0) {
            throw new IllegalArgumentException("후보 좌표 범위가 올바르지 않습니다.");
        }
        if (expectedCost < 0 || expectedCost > 100_000_000) {
            throw new IllegalArgumentException("후보 비용 범위가 올바르지 않습니다.");
        }
        if (totalTravelMinutes < 0 || totalTravelMinutes > 1440) {
            throw new IllegalArgumentException("후보 이동시간 범위가 올바르지 않습니다.");
        }
        if (activityLevel < 1 || activityLevel > 5) {
            throw new IllegalArgumentException("후보 활동 강도는 1~5여야 합니다.");
        }
    }
}
