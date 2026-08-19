package com.chungnamdevelopers.dajeong.api.disruption;

public record DisruptionCreationResult(
        DisruptionResponse disruption,
        boolean created
) {
}
