package com.chungnamdevelopers.dajeong.api.error;

import io.swagger.v3.oas.annotations.media.Schema;

public record ApiErrorResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        String code,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        String message
) {
}
