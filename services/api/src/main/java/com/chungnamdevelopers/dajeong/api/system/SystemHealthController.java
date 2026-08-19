package com.chungnamdevelopers.dajeong.api.system;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/system")
public class SystemHealthController {

    private static final String SYSTEM_HEALTH_QUERY = """
            select exists (
                select 1
                from public.system_health
                where id = 1
            )
            """;

    private final ObjectProvider<JdbcClient> jdbcClientProvider;

    public SystemHealthController(ObjectProvider<JdbcClient> jdbcClientProvider) {
        this.jdbcClientProvider = jdbcClientProvider;
    }

    @Operation(operationId = "getSystemHealth", summary = "시스템 상태 확인")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "데이터베이스와 스키마가 준비됨",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = SystemHealthResponse.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "503",
                    description = "데이터베이스 또는 스키마를 사용할 수 없음",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = SystemHealthResponse.class)
                    )
            )
    })
    @GetMapping("/health")
    public ResponseEntity<SystemHealthResponse> health() {
        JdbcClient jdbcClient = jdbcClientProvider.getIfAvailable();

        if (jdbcClient == null) {
            return unavailable();
        }

        try {
            boolean schemaReady = jdbcClient.sql(SYSTEM_HEALTH_QUERY)
                    .query(Boolean.class)
                    .single();

            if (schemaReady) {
                return ResponseEntity.ok(SystemHealthResponse.up());
            }
        } catch (DataAccessException ignored) {
            // The response intentionally omits database error details.
        }

        return unavailable();
    }

    private ResponseEntity<SystemHealthResponse> unavailable() {
        return ResponseEntity.status(503).body(SystemHealthResponse.down());
    }
}
