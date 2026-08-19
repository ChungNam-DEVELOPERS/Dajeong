package com.chungnamdevelopers.dajeong.api.disruption;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

public record DisruptionListResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID tripId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<DisruptionResponse> disruptions
) {
}
