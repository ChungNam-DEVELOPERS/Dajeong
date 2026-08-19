package com.chungnamdevelopers.dajeong.api.proposal;

import com.chungnamdevelopers.dajeong.api.itinerary.ItineraryCategory;
import com.chungnamdevelopers.dajeong.api.preference.PreferenceCategory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Component
class ProposalScorer {

    private static final BigDecimal CATEGORY_WEIGHT = new BigDecimal("0.35");
    private static final BigDecimal BUDGET_WEIGHT = new BigDecimal("0.25");
    private static final BigDecimal TRAVEL_WEIGHT = new BigDecimal("0.20");
    private static final BigDecimal ACTIVITY_WEIGHT = new BigDecimal("0.20");
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    List<ScoredProposalCandidate> rank(
            List<ProposalCandidate> candidates,
            List<ProposalMemberPreference> preferences
    ) {
        return candidates.stream()
                .map(candidate -> score(candidate, preferences))
                .sorted(Comparator
                        .comparing(
                                ScoredProposalCandidate::minimumMemberSatisfaction,
                                Comparator.reverseOrder()
                        )
                        .thenComparing(
                                ScoredProposalCandidate::weightedAverageSatisfaction,
                                Comparator.reverseOrder()
                        )
                        .thenComparingInt(scored ->
                                scored.candidate().totalTravelMinutes())
                        .thenComparing(scored ->
                                scored.candidate().sourceCandidateId()))
                .toList();
    }

    private ScoredProposalCandidate score(
            ProposalCandidate candidate,
            List<ProposalMemberPreference> preferences
    ) {
        List<ProposalMemberScore> memberScores = preferences.stream()
                .map(preference -> scoreMember(candidate, preference))
                .toList();
        BigDecimal minimum = memberScores.stream()
                .map(ProposalMemberScore::utility)
                .min(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO.setScale(2));
        BigDecimal weightedTotal = memberScores.stream()
                .map(score -> score.utility().multiply(score.concessionWeight()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalWeight = memberScores.stream()
                .map(ProposalMemberScore::concessionWeight)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal weightedAverage = totalWeight.signum() == 0
                ? BigDecimal.ZERO.setScale(2)
                : weightedTotal.divide(totalWeight, 2, RoundingMode.HALF_UP);
        return new ScoredProposalCandidate(
                candidate,
                memberScores,
                minimum,
                weightedAverage
        );
    }

    private ProposalMemberScore scoreMember(
            ProposalCandidate candidate,
            ProposalMemberPreference preference
    ) {
        BigDecimal categoryMatch = categoryMatch(
                candidate.category(),
                preference.preferredCategories()
        );
        BigDecimal budgetFit = budgetFit(
                candidate.expectedCost(),
                preference.budgetPerPerson()
        );
        BigDecimal travelFit = travelFit(
                candidate.totalTravelMinutes(),
                preference.travelTolerance()
        );
        BigDecimal activityFit = scaled(
                100 - Math.abs(candidate.activityLevel() - preference.activityLevel()) * 25
        );
        BigDecimal utility = categoryMatch.multiply(CATEGORY_WEIGHT)
                .add(budgetFit.multiply(BUDGET_WEIGHT))
                .add(travelFit.multiply(TRAVEL_WEIGHT))
                .add(activityFit.multiply(ACTIVITY_WEIGHT))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal concessionWeight = BigDecimal.ONE
                .add(preference.concessionScore().divide(
                        ONE_HUNDRED,
                        2,
                        RoundingMode.HALF_UP
                ))
                .setScale(2, RoundingMode.HALF_UP);
        return new ProposalMemberScore(
                preference.userId(),
                categoryMatch,
                budgetFit,
                travelFit,
                activityFit,
                utility,
                concessionWeight
        );
    }

    private BigDecimal categoryMatch(
            ItineraryCategory category,
            List<PreferenceCategory> preferredCategories
    ) {
        Set<PreferenceCategory> equivalents = switch (category) {
            case MEAL -> EnumSet.of(PreferenceCategory.FOOD);
            case CAFE -> EnumSet.of(PreferenceCategory.CAFE, PreferenceCategory.FOOD);
            case CULTURE -> EnumSet.of(
                    PreferenceCategory.CULTURE,
                    PreferenceCategory.EXPERIENCE
            );
            case ACTIVITY -> EnumSet.of(
                    PreferenceCategory.ACTIVITY,
                    PreferenceCategory.NATURE,
                    PreferenceCategory.EXPERIENCE
            );
            case SHOPPING -> EnumSet.of(PreferenceCategory.SHOPPING);
            case TRANSIT, OTHER -> EnumSet.noneOf(PreferenceCategory.class);
        };
        for (int index = 0; index < preferredCategories.size(); index++) {
            if (equivalents.contains(preferredCategories.get(index))) {
                return scaled(Math.max(60, 100 - index * 10));
            }
        }
        return scaled(20);
    }

    private BigDecimal budgetFit(int expectedCost, int budgetPerPerson) {
        if (expectedCost <= budgetPerPerson) {
            return scaled(100);
        }
        if (budgetPerPerson == 0) {
            return scaled(0);
        }
        int overage = expectedCost - budgetPerPerson;
        int penalty = (int) Math.min(
                100L,
                (overage * 100L + budgetPerPerson / 2L) / budgetPerPerson
        );
        return scaled(100 - penalty);
    }

    private BigDecimal travelFit(int travelMinutes, int tolerance) {
        int allowedMinutes = 15 + tolerance * 15;
        if (travelMinutes <= allowedMinutes) {
            return scaled(100);
        }
        int penalty = Math.min(100, travelMinutes - allowedMinutes);
        return scaled(100 - penalty);
    }

    private BigDecimal scaled(int value) {
        return BigDecimal.valueOf(Math.max(0, Math.min(100, value)))
                .setScale(2, RoundingMode.HALF_UP);
    }
}
