package com.chungnamdevelopers.dajeong.api.invite;

import com.chungnamdevelopers.dajeong.api.error.ApiException;
import com.chungnamdevelopers.dajeong.api.identity.CurrentUserResponse;
import com.chungnamdevelopers.dajeong.api.trip.MembershipRole;
import com.chungnamdevelopers.dajeong.api.trip.TripRegion;
import com.chungnamdevelopers.dajeong.api.trip.TripStatus;
import com.chungnamdevelopers.dajeong.api.trip.TripSummaryResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
public class InviteService {

    private static final Duration INVITE_TTL = Duration.ofDays(7);
    private static final int MAX_ACTIVE_MEMBERS = 6;

    private final Clock clock;
    private final ObjectProvider<JdbcClient> jdbcClientProvider;
    private final SecureRandom secureRandom;

    @Autowired
    public InviteService(ObjectProvider<JdbcClient> jdbcClientProvider) {
        this(jdbcClientProvider, Clock.systemUTC(), new SecureRandom());
    }

    InviteService(
            ObjectProvider<JdbcClient> jdbcClientProvider,
            Clock clock,
            SecureRandom secureRandom
    ) {
        this.jdbcClientProvider = jdbcClientProvider;
        this.clock = clock;
        this.secureRandom = secureRandom;
    }

    @Transactional
    public InviteResponse issue(CurrentUserResponse currentUser, UUID tripId) {
        JdbcClient jdbcClient = requireJdbcClient();
        lockJoinableTrip(jdbcClient, tripId);
        requireActiveHost(jdbcClient, tripId, currentUser.id());

        Instant now = clock.instant();
        jdbcClient.sql("""
                        update public.trip_invite
                        set revoked_at = :revokedAt
                        where trip_id = :tripId
                          and revoked_at is null
                        """)
                .param("revokedAt", Timestamp.from(now))
                .param("tripId", tripId)
                .update();

        String code = generateCode();
        Instant expiresAt = now.plus(INVITE_TTL);
        jdbcClient.sql("""
                        insert into public.trip_invite (
                            id,
                            trip_id,
                            code_hash,
                            created_by_user_id,
                            expires_at,
                            created_at
                        )
                        values (
                            :id,
                            :tripId,
                            :codeHash,
                            :createdByUserId,
                            :expiresAt,
                            :createdAt
                        )
                        """)
                .param("id", UUID.randomUUID())
                .param("tripId", tripId)
                .param("codeHash", sha256(code))
                .param("createdByUserId", currentUser.id())
                .param("expiresAt", Timestamp.from(expiresAt))
                .param("createdAt", Timestamp.from(now))
                .update();

        return new InviteResponse(code, expiresAt);
    }

    @Transactional
    public JoinTripResult join(CurrentUserResponse currentUser, String code) {
        JdbcClient jdbcClient = requireJdbcClient();
        String codeHash = sha256(normalizeCode(code));
        UUID tripId = findInviteTripId(jdbcClient, codeHash)
                .orElseThrow(this::inviteGone);

        lockJoinableTrip(jdbcClient, tripId);
        InviteState invite = loadInviteState(jdbcClient, codeHash)
                .orElseThrow(this::inviteGone);
        if (invite.revokedAt() != null
                || !invite.expiresAt().isAfter(clock.instant())) {
            throw inviteGone();
        }

        Optional<TripSummaryResponse> activeMembership = loadTrip(
                jdbcClient,
                tripId,
                currentUser.id()
        );
        if (activeMembership.isPresent()) {
            return new JoinTripResult(activeMembership.get(), false);
        }

        int activeMembers = jdbcClient.sql("""
                        select count(*)
                        from public.trip_membership
                        where trip_id = :tripId
                          and status = 'ACTIVE'
                        """)
                .param("tripId", tripId)
                .query(Integer.class)
                .single();
        if (activeMembers >= MAX_ACTIVE_MEMBERS) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "TRIP_FULL",
                    "이 여행은 최대 6명까지 참여할 수 있습니다."
            );
        }

        jdbcClient.sql("""
                        insert into public.trip_membership (
                            id,
                            trip_id,
                            user_id,
                            role,
                            status
                        )
                        values (:id, :tripId, :userId, 'MEMBER', 'ACTIVE')
                        on conflict (trip_id, user_id) do update
                        set role = 'MEMBER',
                            status = 'ACTIVE',
                            ended_at = null,
                            updated_at = current_timestamp
                        """)
                .param("id", UUID.randomUUID())
                .param("tripId", tripId)
                .param("userId", currentUser.id())
                .update();

        return new JoinTripResult(
                loadTrip(jdbcClient, tripId, currentUser.id()).orElseThrow(),
                true
        );
    }

    private void lockJoinableTrip(JdbcClient jdbcClient, UUID tripId) {
        boolean exists = jdbcClient.sql("""
                        select id
                        from public.trip
                        where id = :tripId
                          and status in ('DRAFT', 'ACTIVE')
                        for update
                        """)
                .param("tripId", tripId)
                .query(UUID.class)
                .optional()
                .isPresent();
        if (!exists) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "INVITE_FORBIDDEN",
                    "이 여행의 초대를 사용할 수 없습니다."
            );
        }
    }

    private void requireActiveHost(
            JdbcClient jdbcClient,
            UUID tripId,
            UUID userId
    ) {
        boolean isHost = jdbcClient.sql("""
                        select exists (
                            select 1
                            from public.trip_membership
                            where trip_id = :tripId
                              and user_id = :userId
                              and role = 'HOST'
                              and status = 'ACTIVE'
                        )
                        """)
                .param("tripId", tripId)
                .param("userId", userId)
                .query(Boolean.class)
                .single();
        if (!isHost) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "INVITE_FORBIDDEN",
                    "방장만 초대 링크를 발급할 수 있습니다."
            );
        }
    }

    private Optional<UUID> findInviteTripId(
            JdbcClient jdbcClient,
            String codeHash
    ) {
        return jdbcClient.sql("""
                        select trip_id
                        from public.trip_invite
                        where code_hash = :codeHash
                        """)
                .param("codeHash", codeHash)
                .query(UUID.class)
                .optional();
    }

    private Optional<InviteState> loadInviteState(
            JdbcClient jdbcClient,
            String codeHash
    ) {
        return jdbcClient.sql("""
                        select expires_at, revoked_at
                        from public.trip_invite
                        where code_hash = :codeHash
                        """)
                .param("codeHash", codeHash)
                .query((resultSet, rowNumber) -> new InviteState(
                        resultSet.getObject("expires_at", Timestamp.class).toInstant(),
                        Optional.ofNullable(
                                        resultSet.getObject("revoked_at", Timestamp.class)
                                )
                                .map(Timestamp::toInstant)
                                .orElse(null)
                ))
                .optional();
    }

    private Optional<TripSummaryResponse> loadTrip(
            JdbcClient jdbcClient,
            UUID tripId,
            UUID userId
    ) {
        return jdbcClient.sql("""
                        select
                            t.id,
                            t.title,
                            t.region,
                            t.start_date,
                            t.end_date,
                            t.status,
                            m.role,
                            t.created_at
                        from public.trip t
                        join public.trip_membership m
                          on m.trip_id = t.id
                         and m.user_id = :userId
                         and m.status = 'ACTIVE'
                        where t.id = :tripId
                        """)
                .param("tripId", tripId)
                .param("userId", userId)
                .query((resultSet, rowNumber) -> new TripSummaryResponse(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getString("title"),
                        TripRegion.valueOf(resultSet.getString("region")),
                        resultSet.getObject("start_date", java.time.LocalDate.class),
                        resultSet.getObject("end_date", java.time.LocalDate.class),
                        TripStatus.valueOf(resultSet.getString("status")),
                        MembershipRole.valueOf(resultSet.getString("role")),
                        resultSet.getObject("created_at", Timestamp.class).toInstant()
                ))
                .optional();
    }

    private JdbcClient requireJdbcClient() {
        JdbcClient jdbcClient = jdbcClientProvider.getIfAvailable();
        if (jdbcClient == null) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "TRIP_STORE_UNAVAILABLE",
                    "여행 저장소가 구성되지 않았습니다."
            );
        }
        return jdbcClient;
    }

    private String generateCode() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String normalizeCode(String code) {
        if (code == null || code.isBlank() || code.length() > 200) {
            throw inviteGone();
        }
        return code.strip();
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(
                    digest.digest(value.getBytes(StandardCharsets.UTF_8))
            );
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }

    private ApiException inviteGone() {
        return new ApiException(
                HttpStatus.GONE,
                "INVITE_GONE",
                "초대 링크가 만료됐거나 더 이상 사용할 수 없습니다."
        );
    }

    private record InviteState(Instant expiresAt, Instant revokedAt) {
    }
}
