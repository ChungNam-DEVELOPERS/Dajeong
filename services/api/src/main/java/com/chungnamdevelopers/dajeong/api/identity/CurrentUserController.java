package com.chungnamdevelopers.dajeong.api.identity;

import com.chungnamdevelopers.dajeong.api.config.SecurityConfiguration;
import com.chungnamdevelopers.dajeong.api.error.ApiErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
public class CurrentUserController {

    private final IdentityService identityService;

    public CurrentUserController(IdentityService identityService) {
        this.identityService = identityService;
    }

    @Operation(
            operationId = "getCurrentUser",
            summary = "현재 사용자 조회",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "현재 사용자를 조회하거나 처음 생성함",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = CurrentUserResponse.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "인증되지 않은 요청",
                    content = @Content
            ),
            @ApiResponse(
                    responseCode = "503",
                    description = "사용자 저장소를 사용할 수 없음",
                    content = @Content
            ),
            @ApiResponse(
                    responseCode = "410",
                    description = "이미 삭제된 계정",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)
                    )
            )
    })
    @GetMapping
    public CurrentUserResponse currentUser(@AuthenticationPrincipal Jwt jwt) {
        String displayName = firstNonBlank(
                jwt.getClaimAsString("name"),
                jwt.getClaimAsString("preferred_username"),
                jwt.getClaimAsString("username")
        );
        return identityService.getOrCreate(jwt.getSubject(), displayName);
    }

    @Operation(
            operationId = "deleteCurrentUser",
            summary = "현재 사용자 계정 삭제",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "204",
                    description = "계정 개인정보와 활성 도메인 관계 삭제",
                    content = @Content
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "인증되지 않은 요청",
                    content = @Content
            ),
            @ApiResponse(
                    responseCode = "503",
                    description = "사용자 저장소를 사용할 수 없음",
                    content = @Content
            )
    })
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        identityService.deleteAccount(jwt.getSubject());
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
