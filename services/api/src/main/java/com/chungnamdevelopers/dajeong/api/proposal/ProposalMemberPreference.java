package com.chungnamdevelopers.dajeong.api.proposal;

import com.chungnamdevelopers.dajeong.api.preference.PreferenceCategory;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

record ProposalMemberPreference(
        UUID userId,
        int budgetPerPerson,
        int activityLevel,
        int travelTolerance,
        List<PreferenceCategory> preferredCategories,
        BigDecimal concessionScore
) {
}
