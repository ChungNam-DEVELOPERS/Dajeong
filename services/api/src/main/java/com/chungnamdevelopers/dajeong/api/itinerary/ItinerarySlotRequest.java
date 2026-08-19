package com.chungnamdevelopers.dajeong.api.itinerary;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ItinerarySlotRequest(
        @NotNull
        @Schema(example = "2026-09-01T10:00:00+09:00")
        OffsetDateTime startsAt,

        @NotNull
        @Schema(example = "2026-09-01T11:30:00+09:00")
        OffsetDateTime endsAt,

        @NotBlank
        @Size(max = 120)
        @Schema(example = "국립중앙과학관")
        String placeName,

        @NotBlank
        @Size(max = 240)
        @Schema(example = "대전 유성구 대덕대로 481")
        String address,

        @DecimalMin("-90.0")
        @DecimalMax("90.0")
        @Schema(example = "36.3741", nullable = true)
        BigDecimal latitude,

        @DecimalMin("-180.0")
        @DecimalMax("180.0")
        @Schema(example = "127.3778", nullable = true)
        BigDecimal longitude,

        @NotNull
        @Schema(example = "true")
        Boolean indoor,

        @NotNull
        @Schema(example = "CULTURE")
        ItineraryCategory category,

        @NotNull
        @Min(0)
        @Max(100_000_000)
        @Schema(example = "3000")
        Integer expectedCost
) {
}
