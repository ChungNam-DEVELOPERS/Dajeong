package com.chungnamdevelopers.dajeong.api.identity;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.util.UUID;

@Service
public class IdentityService {

    private static final String DEFAULT_DISPLAY_NAME = "다정 사용자";
    private static final int MAX_DISPLAY_NAME_LENGTH = 100;

    private final ObjectProvider<JdbcClient> jdbcClientProvider;

    public IdentityService(ObjectProvider<JdbcClient> jdbcClientProvider) {
        this.jdbcClientProvider = jdbcClientProvider;
    }

    @Transactional
    public CurrentUserResponse getOrCreate(String subject, String requestedDisplayName) {
        JdbcClient jdbcClient = jdbcClientProvider.getIfAvailable();
        if (jdbcClient == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "사용자 저장소가 구성되지 않았습니다."
            );
        }

        jdbcClient.sql("""
                        insert into public.app_user (id, cognito_subject, display_name)
                        values (:id, :subject, :displayName)
                        on conflict (cognito_subject) do nothing
                        """)
                .param("id", UUID.randomUUID())
                .param("subject", subject)
                .param("displayName", normalizeDisplayName(requestedDisplayName))
                .update();

        return jdbcClient.sql("""
                        select id, display_name, status, created_at
                        from public.app_user
                        where cognito_subject = :subject
                        """)
                .param("subject", subject)
                .query((resultSet, rowNumber) -> new CurrentUserResponse(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getString("display_name"),
                        UserStatus.valueOf(resultSet.getString("status")),
                        resultSet.getObject("created_at", Timestamp.class).toInstant()
                ))
                .single();
    }

    private String normalizeDisplayName(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_DISPLAY_NAME;
        }

        String normalized = value.strip();
        if (normalized.length() <= MAX_DISPLAY_NAME_LENGTH) {
            return normalized;
        }

        return normalized.substring(0, MAX_DISPLAY_NAME_LENGTH);
    }
}
