package com.chungnamdevelopers.dajeong.api.disruption;

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
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping(value = "/api/v1", produces = MediaType.APPLICATION_JSON_VALUE)
public class DisruptionController {

    private final IdentityService identityService;
    private final DisruptionService disruptionService;

    public DisruptionController(
            IdentityService identityService,
            DisruptionService disruptionService
    ) {
        this.identityService = identityService;
        this.disruptionService = disruptionService;
    }

    @Operation(
            operationId = "createDisruption",
            summary = "수동 문제 신고",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "문제 신고 생성",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = DisruptionResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "200", description = "멱등 요청 재응답"),
            @ApiResponse(responseCode = "400", description = "잘못된 신고 입력", content = @Content),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content),
            @ApiResponse(responseCode = "403", description = "활성 멤버십 없음", content = @Content),
            @ApiResponse(responseCode = "404", description = "현재 일정 슬롯 없음", content = @Content),
            @ApiResponse(
                    responseCode = "409",
                    description = "종료 여행 또는 멱등 충돌",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)
                    )
            )
    })
    @PostMapping("/trips/{tripId}/disruptions")
    public ResponseEntity<DisruptionResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tripId,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody CreateDisruptionRequest request
    ) {
        DisruptionCreationResult result = disruptionService.create(
                currentUser(jwt),
                tripId,
                idempotencyKey,
                request
        );
        return ResponseEntity
                .status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(result.disruption());
    }

    @Operation(
            operationId = "listDisruptions",
            summary = "여행 문제 목록",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @GetMapping("/trips/{tripId}/disruptions")
    public DisruptionListResponse list(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tripId
    ) {
        return disruptionService.list(currentUser(jwt), tripId);
    }

    @Operation(
            operationId = "dismissDisruption",
            summary = "문제 확인 후 원본 일정 유지",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @PostMapping("/disruptions/{disruptionId}/dismiss")
    public DisruptionResponse dismiss(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID disruptionId,
            @RequestHeader("Idempotency-Key") String idempotencyKey
    ) {
        return disruptionService.dismiss(currentUser(jwt), disruptionId, idempotencyKey);
    }

    @Operation(
            operationId = "startDisruptionReplan",
            summary = "문제 확인 후 재조정 시작",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "202",
                    description = "재조정 시작을 확인한 문제",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = DisruptionResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content),
            @ApiResponse(responseCode = "403", description = "활성 멤버십 없음", content = @Content),
            @ApiResponse(responseCode = "409", description = "이미 처리된 문제", content = @Content)
    })
    @PostMapping("/disruptions/{disruptionId}/replans")
    public ResponseEntity<DisruptionResponse> startReplan(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID disruptionId,
            @RequestHeader("Idempotency-Key") String idempotencyKey
    ) {
        return ResponseEntity.accepted().body(
                disruptionService.startReplan(
                        currentUser(jwt),
                        disruptionId,
                        idempotencyKey
                )
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
