package com.chungnamdevelopers.dajeong.api.disruption;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateDisruptionRequest(
        @NotNull
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        UUID itinerarySlotId,
        @NotNull
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        DisruptionType type,
        @NotBlank
        @Size(max = 200)
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, maxLength = 200)
        String description
) {
}
