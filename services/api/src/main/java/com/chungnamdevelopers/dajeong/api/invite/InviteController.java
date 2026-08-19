package com.chungnamdevelopers.dajeong.api.invite;

import com.chungnamdevelopers.dajeong.api.config.SecurityConfiguration;
import com.chungnamdevelopers.dajeong.api.error.ApiErrorResponse;
import com.chungnamdevelopers.dajeong.api.identity.CurrentUserResponse;
import com.chungnamdevelopers.dajeong.api.identity.IdentityService;
import com.chungnamdevelopers.dajeong.api.trip.TripSummaryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class InviteController {

    private final IdentityService identityService;
    private final InviteService inviteService;

    public InviteController(
            IdentityService identityService,
            InviteService inviteService
    ) {
        this.identityService = identityService;
        this.inviteService = inviteService;
    }

    @Operation(
            operationId = "issueTripInvite",
            summary = "여행 초대 발급",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "새 7일 초대 코드 발급",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = InviteResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content),
            @ApiResponse(
                    responseCode = "403",
                    description = "방장 권한 없음",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "503", description = "여행 저장소 사용 불가", content = @Content)
    })
    @PostMapping("/trips/{tripId}/invites")
    public ResponseEntity<InviteResponse> issueTripInvite(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tripId
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(inviteService.issue(currentUser(jwt), tripId));
    }

    @Operation(
            operationId = "joinTripByInvite",
            summary = "초대 코드로 여행 가입",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "새 MEMBER 멤버십 생성",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = TripSummaryResponse.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "200",
                    description = "이미 가입한 여행 반환",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = TripSummaryResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content),
            @ApiResponse(
                    responseCode = "409",
                    description = "여행 정원 초과",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "410",
                    description = "만료 또는 폐기된 초대",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "503", description = "여행 저장소 사용 불가", content = @Content)
    })
    @PostMapping("/invites/{code}/join")
    public ResponseEntity<TripSummaryResponse> joinTripByInvite(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String code
    ) {
        JoinTripResult result = inviteService.join(currentUser(jwt), code);
        return ResponseEntity
                .status(result.joined() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(result.trip());
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
