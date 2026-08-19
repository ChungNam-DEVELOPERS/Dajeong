package com.chungnamdevelopers.dajeong.api.trip;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateTripRequest(
        @NotBlank
        @Size(max = 100)
        @Schema(example = "대전 여름 여행")
        String title,

        @NotNull
        @Schema(example = "2026-08-21")
        LocalDate startDate,

        @NotNull
        @Schema(example = "2026-08-23")
        LocalDate endDate
) {
}
