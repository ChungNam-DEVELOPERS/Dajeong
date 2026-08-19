package com.chungnamdevelopers.dajeong.api.notification;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

public record NotificationListResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        List<NotificationResponse> items,
        @Schema(nullable = true) String nextCursor
) {
    public NotificationListResponse {
        items = List.copyOf(items);
    }
}
