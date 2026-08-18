package com.chungnamdevelopers.dajeong.api.system;

public record SystemHealthResponse(Status status, Status database) {

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
