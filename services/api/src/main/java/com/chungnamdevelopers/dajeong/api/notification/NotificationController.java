package com.chungnamdevelopers.dajeong.api.notification;

import com.chungnamdevelopers.dajeong.api.config.SecurityConfiguration;
import com.chungnamdevelopers.dajeong.api.error.ApiErrorResponse;
import com.chungnamdevelopers.dajeong.api.identity.CurrentUserResponse;
import com.chungnamdevelopers.dajeong.api.identity.IdentityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@Validated
public class NotificationController {

    private final IdentityService identityService;
    private final NotificationService notificationService;

    public NotificationController(
            IdentityService identityService,
            NotificationService notificationService
    ) {
        this.identityService = identityService;
        this.notificationService = notificationService;
    }

    @Operation(
            operationId = "listNotifications",
            summary = "내 인앱 알림 목록",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "현재 사용자의 활성 여행 알림",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = NotificationListResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "잘못된 cursor 또는 limit", content = @Content),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content)
    })
    @GetMapping
    public NotificationListResponse list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit
    ) {
        return notificationService.list(currentUser(jwt), cursor, limit);
    }

    @Operation(
            operationId = "readNotification",
            summary = "내 인앱 알림 읽음 처리",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "읽음 시각이 동기화된 알림",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = NotificationResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content),
            @ApiResponse(
                    responseCode = "404",
                    description = "내 활성 여행 알림이 아님",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)
                    )
            )
    })
    @PostMapping("/{notificationId}/read")
    public NotificationResponse read(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID notificationId
    ) {
        return notificationService.markRead(
                currentUser(jwt),
                notificationId,
                Instant.now()
        );
    }

    private CurrentUserResponse currentUser(Jwt jwt) {
        return identityService.getOrCreate(
                jwt.getSubject(),
                firstNonBlank(
                        jwt.getClaimAsString("name"),
                        jwt.getClaimAsString("preferred_username"),
                        jwt.getClaimAsString("username")
                )
        );
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
