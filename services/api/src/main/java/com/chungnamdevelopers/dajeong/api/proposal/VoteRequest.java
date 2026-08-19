package com.chungnamdevelopers.dajeong.api.proposal;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record VoteRequest(
        @NotNull
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        UUID proposalId
) {
}
