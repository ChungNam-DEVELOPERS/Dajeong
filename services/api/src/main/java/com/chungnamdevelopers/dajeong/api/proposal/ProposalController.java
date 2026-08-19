package com.chungnamdevelopers.dajeong.api.proposal;

import com.chungnamdevelopers.dajeong.api.config.SecurityConfiguration;
import com.chungnamdevelopers.dajeong.api.identity.CurrentUserResponse;
import com.chungnamdevelopers.dajeong.api.identity.IdentityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping(
        value = "/api/v1/proposal-sets",
        produces = MediaType.APPLICATION_JSON_VALUE
)
public class ProposalController {

    private final IdentityService identityService;
    private final ProposalService proposalService;
    private final VoteService voteService;

    public ProposalController(
            IdentityService identityService,
            ProposalService proposalService,
            VoteService voteService
    ) {
        this.identityService = identityService;
        this.proposalService = proposalService;
        this.voteService = voteService;
    }

    @Operation(
            operationId = "getProposalSet",
            summary = "재조정 후보 작업과 그룹 공개 후보 조회",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "후보 작업 조회"),
            @ApiResponse(
                    responseCode = "401",
                    description = "인증되지 않은 요청",
                    content = @Content
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "활성 멤버십 없음",
                    content = @Content
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "후보 작업 없음",
                    content = @Content
            )
    })
    @GetMapping("/{proposalSetId}")
    public ProposalSetResponse get(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID proposalSetId
    ) {
        return proposalService.get(currentUser(jwt), proposalSetId);
    }

    @Operation(
            operationId = "upsertProposalVote",
            summary = "내 익명 투표 생성 또는 변경",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "투표 반영 후 집계"),
            @ApiResponse(responseCode = "400", description = "다른 세트 후보", content = @Content),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content),
            @ApiResponse(responseCode = "403", description = "활성 멤버십 없음", content = @Content),
            @ApiResponse(responseCode = "409", description = "투표 마감", content = @Content)
    })
    @PutMapping("/{proposalSetId}/vote")
    public ProposalSetResponse upsertVote(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID proposalSetId,
            @Valid @RequestBody VoteRequest request
    ) {
        return voteService.upsert(currentUser(jwt), proposalSetId, request);
    }

    @Operation(
            operationId = "withdrawProposalVote",
            summary = "마감 전 내 익명 투표 철회",
            security = @SecurityRequirement(name = SecurityConfiguration.BEARER_AUTH)
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "투표 철회 후 집계"),
            @ApiResponse(responseCode = "401", description = "인증되지 않은 요청", content = @Content),
            @ApiResponse(responseCode = "403", description = "활성 멤버십 없음", content = @Content),
            @ApiResponse(responseCode = "409", description = "투표 마감", content = @Content)
    })
    @DeleteMapping("/{proposalSetId}/vote")
    public ProposalSetResponse withdrawVote(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID proposalSetId
    ) {
        return voteService.withdraw(currentUser(jwt), proposalSetId);
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
