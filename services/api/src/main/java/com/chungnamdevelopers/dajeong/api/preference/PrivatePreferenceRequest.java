package com.chungnamdevelopers.dajeong.api.preference;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record PrivatePreferenceRequest(
        @NotNull
        @Min(0)
        @Max(100_000_000)
        @Schema(example = "50000")
        Integer budgetPerPerson,

        @NotNull
        @Min(1)
        @Max(5)
        @Schema(example = "3")
        Integer activityLevel,

        @NotNull
        @Min(1)
        @Max(5)
        @Schema(example = "2")
        Integer travelTolerance,

        @NotNull
        @Size(min = 1, max = 7)
        @Valid
        List<@NotNull PreferenceCategory> preferredCategories,

        @NotNull
        @Size(min = 1, max = 2)
        @Valid
        List<@NotNull PreferencePriority> priorities
) {
}
