package com.chungnamdevelopers.dajeong.api.itinerary;

import com.chungnamdevelopers.dajeong.api.config.SecurityConfiguration;
import com.chungnamdevelopers.dajeong.api.error.ApiErrorResponse;
import com.chungnamdevelopers.dajeong.api.error.ApiException;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/trips/{tripId}/itineraries")
public class ItineraryController {

    private final IdentityService identityService;
    private final ItineraryService itineraryService;

    public ItineraryController(
            IdentityService identityService,
            ItineraryService itineraryService
    ) {
        this.identityService = identityService;
        this.itineraryService = itineraryService;
    }

    @Operation(
            operationId = "getItineraryDraft",
            summary = "방장 일정 초안 조회",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "현재 일정 초안",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ItineraryDraftResponse.class)
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
            )
    })
    @GetMapping("/draft")
    public ResponseEntity<ItineraryDraftResponse> getDraft(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tripId
    ) {
        return draftResponse(itineraryService.getDraft(currentUser(jwt), tripId));
    }

    @Operation(
            operationId = "getCurrentItinerary",
            summary = "최신 확정 일정 조회",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "최신 불변 일정 버전",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ItineraryVersionResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content),
            @ApiResponse(
                    responseCode = "403",
                    description = "활성 멤버십 없음",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "발행된 일정 없음",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)
                    )
            )
    })
    @GetMapping("/current")
    public ItineraryVersionResponse getCurrent(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tripId
    ) {
        return itineraryService.getCurrent(currentUser(jwt), tripId);
    }

    @Operation(
            operationId = "addItineraryDraftSlot",
            summary = "일정 초안 슬롯 추가",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "새 초안 슬롯 생성",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ItineraryDraftResponse.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "200",
                    description = "동일한 멱등 요청 결과 반환",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ItineraryDraftResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "잘못된 슬롯", content = @Content),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content),
            @ApiResponse(responseCode = "403", description = "방장 권한 없음", content = @Content),
            @ApiResponse(
                    responseCode = "409",
                    description = "오래된 revision 또는 멱등 충돌",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)
                    )
            )
    })
    @PostMapping("/draft/slots")
    public ResponseEntity<ItineraryDraftResponse> addSlot(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tripId,
            @RequestHeader("If-Match") String ifMatch,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody ItinerarySlotRequest request
    ) {
        DraftMutationResult result = itineraryService.addSlot(
                currentUser(jwt),
                tripId,
                parseRevision(ifMatch),
                idempotencyKey,
                request
        );
        return ResponseEntity
                .status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .eTag(Long.toString(result.draft().revision()))
                .body(result.draft());
    }

    @Operation(
            operationId = "updateItineraryDraftSlot",
            summary = "일정 초안 슬롯 수정",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "수정된 일정 초안",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ItineraryDraftResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "잘못된 슬롯", content = @Content),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content),
            @ApiResponse(responseCode = "403", description = "방장 권한 없음", content = @Content),
            @ApiResponse(responseCode = "404", description = "슬롯 없음", content = @Content),
            @ApiResponse(
                    responseCode = "409",
                    description = "오래된 revision",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)
                    )
            )
    })
    @PatchMapping("/draft/slots/{slotId}")
    public ResponseEntity<ItineraryDraftResponse> updateSlot(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tripId,
            @PathVariable UUID slotId,
            @RequestHeader("If-Match") String ifMatch,
            @Valid @RequestBody ItinerarySlotRequest request
    ) {
        return draftResponse(itineraryService.updateSlot(
                currentUser(jwt),
                tripId,
                slotId,
                parseRevision(ifMatch),
                request
        ));
    }

    @Operation(
            operationId = "deleteItineraryDraftSlot",
            summary = "일정 초안 슬롯 삭제",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "삭제 후 일정 초안",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ItineraryDraftResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content),
            @ApiResponse(responseCode = "403", description = "방장 권한 없음", content = @Content),
            @ApiResponse(responseCode = "404", description = "슬롯 없음", content = @Content),
            @ApiResponse(
                    responseCode = "409",
                    description = "오래된 revision",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)
                    )
            )
    })
    @DeleteMapping("/draft/slots/{slotId}")
    public ResponseEntity<ItineraryDraftResponse> deleteSlot(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tripId,
            @PathVariable UUID slotId,
            @RequestHeader("If-Match") String ifMatch
    ) {
        return draftResponse(itineraryService.deleteSlot(
                currentUser(jwt),
                tripId,
                slotId,
                parseRevision(ifMatch)
        ));
    }

    @Operation(
            operationId = "publishItineraryDraft",
            summary = "일정 초안을 불변 버전으로 발행",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "새 일정 버전 발행",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ItineraryVersionResponse.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "200",
                    description = "동일한 멱등 발행 결과 반환",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ItineraryVersionResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "빈 일정", content = @Content),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content),
            @ApiResponse(responseCode = "403", description = "방장 권한 없음", content = @Content),
            @ApiResponse(
                    responseCode = "409",
                    description = "오래된 revision, 무변경 또는 멱등 충돌",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)
                    )
            )
    })
    @PostMapping("/draft/publish")
    public ResponseEntity<ItineraryVersionResponse> publish(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID tripId,
            @RequestHeader("If-Match") String ifMatch,
            @RequestHeader("Idempotency-Key") String idempotencyKey
    ) {
        PublishItineraryResult result = itineraryService.publish(
                currentUser(jwt),
                tripId,
                parseRevision(ifMatch),
                idempotencyKey
        );
        return ResponseEntity
                .status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(result.version());
    }

    private ResponseEntity<ItineraryDraftResponse> draftResponse(
            ItineraryDraftResponse draft
    ) {
        return ResponseEntity.ok()
                .eTag(Long.toString(draft.revision()))
                .body(draft);
    }

    private long parseRevision(String ifMatch) {
        if (ifMatch == null || ifMatch.isBlank()) {
            throw invalidRevision();
        }
        String value = ifMatch.strip();
        if (value.startsWith("W/")) {
            value = value.substring(2).strip();
        }
        if (value.length() >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
            value = value.substring(1, value.length() - 1);
        }
        try {
            long revision = Long.parseLong(value);
            if (revision < 0) {
                throw invalidRevision();
            }
            return revision;
        } catch (NumberFormatException exception) {
            throw invalidRevision();
        }
    }

    private ApiException invalidRevision() {
        return new ApiException(
                HttpStatus.BAD_REQUEST,
                "INVALID_REVISION",
                "If-Match에 0 이상의 일정 revision을 보내 주세요."
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
