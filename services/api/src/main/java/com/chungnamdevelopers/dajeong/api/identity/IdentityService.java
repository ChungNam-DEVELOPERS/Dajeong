package com.chungnamdevelopers.dajeong.api.identity;

import com.chungnamdevelopers.dajeong.api.error.ApiException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
public class IdentityService {

    private static final String DEFAULT_DISPLAY_NAME = "다정 사용자";
    private static final String DELETED_DISPLAY_NAME = "탈퇴한 멤버";
    private static final int MAX_DISPLAY_NAME_LENGTH = 100;

    private final ObjectProvider<JdbcClient> jdbcClientProvider;

    public IdentityService(ObjectProvider<JdbcClient> jdbcClientProvider) {
        this.jdbcClientProvider = jdbcClientProvider;
    }

    @Transactional
    public CurrentUserResponse getOrCreate(String subject, String requestedDisplayName) {
        JdbcClient jdbcClient = requireJdbcClient();
        String subjectHash = hashSubject(subject);
        rejectDeletedIdentity(jdbcClient, subjectHash);

        jdbcClient.sql("""
                        insert into public.app_user (id, cognito_subject, display_name)
                        values (:id, :subject, :displayName)
                        on conflict (cognito_subject) do nothing
                        """)
                .param("id", UUID.randomUUID())
                .param("subject", subject)
                .param("displayName", normalizeDisplayName(requestedDisplayName))
                .update();

        rejectDeletedIdentity(jdbcClient, subjectHash);
        Optional<CurrentUserResponse> currentUser = jdbcClient.sql("""
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
                .optional();
        if (currentUser.isEmpty()) {
            rejectDeletedIdentity(jdbcClient, subjectHash);
            throw new IllegalStateException("현재 사용자 행을 찾지 못했습니다.");
        }
        if (currentUser.get().status() == UserStatus.DELETED) {
            throw accountDeleted();
        }
        return currentUser.get();
    }

    @Transactional
    public void deleteAccount(String subject) {
        JdbcClient jdbcClient = requireJdbcClient();
        String subjectHash = hashSubject(subject);

        jdbcClient.sql("""
                        insert into public.deleted_identity (subject_hash)
                        values (:subjectHash)
                        on conflict (subject_hash) do nothing
                        """)
                .param("subjectHash", subjectHash)
                .update();

        Optional<UUID> userId = jdbcClient.sql("""
                        select id
                        from public.app_user
                        where cognito_subject = :subject
                        for update
                        """)
                .param("subject", subject)
                .query(UUID.class)
                .optional();
        if (userId.isEmpty()) {
            return;
        }

        Instant deletedAt = Instant.now();
        jdbcClient.sql("""
                        delete from public.private_preference
                        where user_id = :userId
                        """)
                .param("userId", userId.get())
                .update();

        jdbcClient.sql("""
                        update public.trip_invite
                        set revoked_at = :deletedAt
                        where revoked_at is null
                          and (
                            created_by_user_id = :userId
                            or trip_id in (
                                select id
                                from public.trip
                                where host_user_id = :userId
                            )
                          )
                        """)
                .param("deletedAt", Timestamp.from(deletedAt))
                .param("userId", userId.get())
                .update();

        jdbcClient.sql("""
                        update public.trip_membership
                        set status = 'LEFT',
                            ended_at = :deletedAt,
                            updated_at = :deletedAt
                        where status = 'ACTIVE'
                          and (
                            user_id = :userId
                            or trip_id in (
                                select id
                                from public.trip
                                where host_user_id = :userId
                            )
                          )
                        """)
                .param("deletedAt", Timestamp.from(deletedAt))
                .param("userId", userId.get())
                .update();

        jdbcClient.sql("""
                        update public.trip
                        set status = 'ARCHIVED',
                            updated_at = :deletedAt
                        where host_user_id = :userId
                          and status in ('DRAFT', 'ACTIVE')
                        """)
                .param("deletedAt", Timestamp.from(deletedAt))
                .param("userId", userId.get())
                .update();

        jdbcClient.sql("""
                        update public.app_user
                        set cognito_subject = :anonymousSubject,
                            display_name = :deletedDisplayName,
                            status = 'DELETED',
                            updated_at = :deletedAt,
                            deleted_at = :deletedAt
                        where id = :userId
                        """)
                .param("anonymousSubject", "deleted:" + userId.get())
                .param("deletedDisplayName", DELETED_DISPLAY_NAME)
                .param("deletedAt", Timestamp.from(deletedAt))
                .param("userId", userId.get())
                .update();
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

    private JdbcClient requireJdbcClient() {
        JdbcClient jdbcClient = jdbcClientProvider.getIfAvailable();
        if (jdbcClient == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "사용자 저장소가 구성되지 않았습니다."
            );
        }
        return jdbcClient;
    }

    private void rejectDeletedIdentity(JdbcClient jdbcClient, String subjectHash) {
        boolean deleted = jdbcClient.sql("""
                        select exists (
                            select 1
                            from public.deleted_identity
                            where subject_hash = :subjectHash
                        )
                        """)
                .param("subjectHash", subjectHash)
                .query(Boolean.class)
                .single();
        if (deleted) {
            throw accountDeleted();
        }
    }

    private String hashSubject(String subject) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(
                    digest.digest(subject.getBytes(StandardCharsets.UTF_8))
            );
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }

    private ApiException accountDeleted() {
        return new ApiException(
                HttpStatus.GONE,
                "ACCOUNT_DELETED",
                "삭제된 계정입니다."
        );
    }
}
