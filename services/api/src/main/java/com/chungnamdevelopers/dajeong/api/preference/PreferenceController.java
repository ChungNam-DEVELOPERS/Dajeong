package com.chungnamdevelopers.dajeong.api.preference;

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
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/trips/{tripId}/preferences")
public class PreferenceController {

    private final IdentityService identityService;
    private final PreferenceService preferenceService;

    public PreferenceController(
            IdentityService identityService,
            PreferenceService preferenceService
    ) {
        this.identityService = identityService;
        this.preferenceService = preferenceService;
    }

    @Operation(
            operationId = "getMyPrivatePreference",
            summary = "내 비공개 선호 조회",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "현재 로그인 멤버의 원본 선호",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = PrivatePreferenceResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content),
            @ApiResponse(responseCode = "403", description = "활성 멤버십 없음", content = @Content),
            @ApiResponse(
                    responseCode = "404",
                    description = "아직 제출한 선호 없음",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)
                    )
            )
    })
    @GetMapping("/me")
    public PrivatePreferenceResponse getMine(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tripId
    ) {
        return preferenceService.getMine(currentUser(jwt), tripId);
    }

    @Operation(
            operationId = "saveMyPrivatePreference",
            summary = "내 비공개 선호 저장",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "저장된 현재 로그인 멤버의 원본 선호",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = PrivatePreferenceResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "잘못된 선호 입력", content = @Content),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content),
            @ApiResponse(responseCode = "403", description = "활성 멤버십 없음", content = @Content),
            @ApiResponse(
                    responseCode = "409",
                    description = "선호 변경이 종료된 여행",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)
                    )
            )
    })
    @PutMapping("/me")
    public PrivatePreferenceResponse saveMine(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tripId,
            @Valid @RequestBody PrivatePreferenceRequest request
    ) {
        return preferenceService.save(currentUser(jwt), tripId, request);
    }

    @Operation(
            operationId = "getPreferenceSubmissionStatus",
            summary = "멤버별 선호 제출 여부 조회",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "원본 선호를 제외한 활성 멤버별 제출 여부",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = PreferenceStatusResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content),
            @ApiResponse(responseCode = "403", description = "활성 멤버십 없음", content = @Content)
    })
    @GetMapping("/status")
    public PreferenceStatusResponse getStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tripId
    ) {
        return preferenceService.getStatus(currentUser(jwt), tripId);
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
