package com.chungnamdevelopers.dajeong.api.system;

import io.swagger.v3.oas.annotations.media.Schema;

public record SystemHealthResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Status status,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Status database
) {

    public static SystemHealthResponse up() {
        return new SystemHealthResponse(Status.UP, Status.UP);
    }

    public static SystemHealthResponse down() {
        return new SystemHealthResponse(Status.DOWN, Status.DOWN);
    }

    public enum Status {
        UP,
        DOWN
    }
}
