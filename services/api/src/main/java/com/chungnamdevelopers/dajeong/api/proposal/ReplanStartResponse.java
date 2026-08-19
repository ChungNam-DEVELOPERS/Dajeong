package com.chungnamdevelopers.dajeong.api.proposal;

import com.chungnamdevelopers.dajeong.api.disruption.DisruptionStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

public record ReplanStartResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID disruptionId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) DisruptionStatus disruptionStatus,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ProposalSetResponse proposalSet
) {
}
