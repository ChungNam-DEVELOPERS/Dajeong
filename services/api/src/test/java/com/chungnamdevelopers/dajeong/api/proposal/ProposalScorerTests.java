package com.chungnamdevelopers.dajeong.api.proposal;

import com.chungnamdevelopers.dajeong.api.itinerary.ItineraryCategory;
import com.chungnamdevelopers.dajeong.api.preference.PreferenceCategory;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ProposalScorerTests {

    private final ProposalScorer scorer = new ProposalScorer();

    @Test
    void ranksByMinimumThenWeightedAverageTravelAndStableId() {
        List<ProposalMemberPreference> preferences = List.of(
                preference(
                        "00000000-0000-0000-0000-000000000001",
                        10_000,
                        2,
                        3,
                        PreferenceCategory.CAFE,
                        "0"
                ),
                preference(
                        "00000000-0000-0000-0000-000000000002",
                        5_000,
                        4,
                        1,
                        PreferenceCategory.CULTURE,
                        "100"
                )
        );
        ProposalCandidate cafe = candidate(
                "cafe",
                ItineraryCategory.CAFE,
                7_000,
                25,
                2
        );
        ProposalCandidate culture = candidate(
                "culture",
                ItineraryCategory.CULTURE,
                5_000,
                20,
                4
        );
        ProposalCandidate stableLater = candidate(
                "stable-z",
                ItineraryCategory.ACTIVITY,
                3_000,
                10,
                3
        );
        ProposalCandidate stableFirst = candidate(
                "stable-a",
                ItineraryCategory.ACTIVITY,
                3_000,
                10,
                3
        );

        List<ScoredProposalCandidate> ranked = scorer.rank(
                List.of(cafe, culture, stableLater, stableFirst),
                preferences
        );

        assertThat(ranked)
                .extracting(scored -> scored.candidate().sourceCandidateId())
                .containsExactly("stable-a", "stable-z", "culture", "cafe");
        ScoredProposalCandidate cultureScore = ranked.get(2);
        assertThat(cultureScore.minimumMemberSatisfaction())
                .isEqualByComparingTo("62.00");
        assertThat(cultureScore.weightedAverageSatisfaction())
                .isEqualByComparingTo("87.33");
    }

    @Test
    void sameInputAlwaysProducesTheSameScoresAndOrder() {
        List<ProposalMemberPreference> preferences = List.of(preference(
                "00000000-0000-0000-0000-000000000003",
                20_000,
                3,
                2,
                PreferenceCategory.NATURE,
                "35"
        ));
        List<ProposalCandidate> candidates = List.of(
                candidate("second", ItineraryCategory.CULTURE, 12_000, 30, 2),
                candidate("first", ItineraryCategory.ACTIVITY, 18_000, 40, 3)
        );

        assertThat(scorer.rank(candidates, preferences))
                .usingRecursiveComparison()
                .isEqualTo(scorer.rank(candidates, preferences));
    }

    private ProposalMemberPreference preference(
            String userId,
            int budget,
            int activityLevel,
            int travelTolerance,
            PreferenceCategory category,
            String concessionScore
    ) {
        return new ProposalMemberPreference(
                UUID.fromString(userId),
                budget,
                activityLevel,
                travelTolerance,
                List.of(category),
                new BigDecimal(concessionScore)
        );
    }

    private ProposalCandidate candidate(
            String id,
            ItineraryCategory category,
            int expectedCost,
            int travelMinutes,
            int activityLevel
    ) {
        return new ProposalCandidate(
                id,
                id + " 장소",
                "대전광역시 유성구 대학로 1",
                new BigDecimal("36.350000"),
                new BigDecimal("127.380000"),
                true,
                category,
                expectedCost,
                travelMinutes,
                activityLevel,
                true
        );
    }
}
