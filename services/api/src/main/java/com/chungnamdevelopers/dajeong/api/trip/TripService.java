package com.chungnamdevelopers.dajeong.api.trip;

import com.chungnamdevelopers.dajeong.api.identity.CurrentUserResponse;
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
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TripService {

    private static final int MAX_IDEMPOTENCY_KEY_LENGTH = 200;

    private final ObjectProvider<JdbcClient> jdbcClientProvider;

    public TripService(ObjectProvider<JdbcClient> jdbcClientProvider) {
        this.jdbcClientProvider = jdbcClientProvider;
    }

    @Transactional
    public TripCreationResult create(
            CurrentUserResponse currentUser,
            String idempotencyKey,
            CreateTripRequest request
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);
        String normalizedTitle = request.title().strip();
        validateDateRange(request);

        UUID tripId = UUID.randomUUID();
        Optional<UUID> insertedTripId = jdbcClient.sql("""
                        insert into public.trip (
                            id,
                            title,
                            region,
                            start_date,
                            end_date,
                            host_user_id,
                            status,
                            creation_request_key_hash
                        )
                        values (
                            :id,
                            :title,
                            'DAEJEON',
                            :startDate,
                            :endDate,
                            :hostUserId,
                            'DRAFT',
                            :requestKeyHash
                        )
                        on conflict (host_user_id, creation_request_key_hash) do nothing
                        returning id
                        """)
                .param("id", tripId)
                .param("title", normalizedTitle)
                .param("startDate", request.startDate())
                .param("endDate", request.endDate())
                .param("hostUserId", currentUser.id())
                .param("requestKeyHash", sha256(normalizedKey))
                .query(UUID.class)
                .optional();

        if (insertedTripId.isPresent()) {
            jdbcClient.sql("""
                            insert into public.trip_membership (
                                id,
                                trip_id,
                                user_id,
                                role,
                                status
                            )
                            values (:id, :tripId, :userId, 'HOST', 'ACTIVE')
                            """)
                    .param("id", UUID.randomUUID())
                    .param("tripId", tripId)
                    .param("userId", currentUser.id())
                    .update();

            return new TripCreationResult(
                    loadTrip(jdbcClient, tripId, currentUser.id()),
                    true
            );
        }

        TripSummaryResponse existing = jdbcClient.sql("""
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
                        where t.host_user_id = :userId
                          and t.creation_request_key_hash = :requestKeyHash
                        """)
                .param("userId", currentUser.id())
                .param("requestKeyHash", sha256(normalizedKey))
                .query(this::mapTrip)
                .single();

        if (!existing.title().equals(normalizedTitle)
                || !existing.startDate().equals(request.startDate())
                || !existing.endDate().equals(request.endDate())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "같은 Idempotency-Key가 다른 여행 생성 요청에 사용되었습니다."
            );
        }

        return new TripCreationResult(existing, false);
    }

    @Transactional(readOnly = true)
    public TripListResponse list(
            CurrentUserResponse currentUser,
            String encodedCursor,
            int limit
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        TripCursor cursor = decodeCursor(encodedCursor);
        String cursorPredicate = cursor == null
                ? ""
                : """
                   and (
                       t.created_at < :cursorCreatedAt
                       or (t.created_at = :cursorCreatedAt and t.id < :cursorId)
                   )
                   """;

        JdbcClient.StatementSpec statement = jdbcClient.sql("""
                        select
                            t.id,
                            t.title,
                            t.region,
                            t.start_date,
                            t.end_date,
                            t.status,
                            m.role,
                            t.created_at
                        from public.trip_membership m
                        join public.trip t on t.id = m.trip_id
                        where m.user_id = :userId
                          and m.status = 'ACTIVE'
                        """ + cursorPredicate + """
                        order by t.created_at desc, t.id desc
                        limit :queryLimit
                        """)
                .param("userId", currentUser.id())
                .param("queryLimit", limit + 1);

        if (cursor != null) {
            statement = statement
                    .param("cursorCreatedAt", Timestamp.from(cursor.createdAt()))
                    .param("cursorId", cursor.id());
        }

        List<TripSummaryResponse> rows = statement.query(this::mapTrip).list();
        boolean hasMore = rows.size() > limit;
        List<TripSummaryResponse> items = hasMore
                ? new ArrayList<>(rows.subList(0, limit))
                : rows;
        String nextCursor = hasMore
                ? encodeCursor(items.get(items.size() - 1))
                : null;

        return new TripListResponse(items, nextCursor);
    }

    private TripSummaryResponse loadTrip(
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
                .query(this::mapTrip)
                .single();
    }

    private TripSummaryResponse mapTrip(
            java.sql.ResultSet resultSet,
            int rowNumber
    ) throws java.sql.SQLException {
        return new TripSummaryResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("title"),
                TripRegion.valueOf(resultSet.getString("region")),
                resultSet.getObject("start_date", java.time.LocalDate.class),
                resultSet.getObject("end_date", java.time.LocalDate.class),
                TripStatus.valueOf(resultSet.getString("status")),
                MembershipRole.valueOf(resultSet.getString("role")),
                resultSet.getObject("created_at", Timestamp.class).toInstant()
        );
    }

    private JdbcClient requireJdbcClient() {
        JdbcClient jdbcClient = jdbcClientProvider.getIfAvailable();
        if (jdbcClient == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "여행 저장소가 구성되지 않았습니다."
            );
        }
        return jdbcClient;
    }

    private void validateDateRange(CreateTripRequest request) {
        if (request.endDate().isBefore(request.startDate())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "여행 종료일은 시작일보다 빠를 수 없습니다."
            );
        }
    }

    private String normalizeIdempotencyKey(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Idempotency-Key가 필요합니다."
            );
        }

        String normalized = value.strip();
        if (normalized.length() > MAX_IDEMPOTENCY_KEY_LENGTH) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Idempotency-Key는 200자를 넘을 수 없습니다."
            );
        }
        return normalized;
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

    private String encodeCursor(TripSummaryResponse trip) {
        String value = trip.createdAt() + "|" + trip.id();
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private TripCursor decodeCursor(String encodedCursor) {
        if (encodedCursor == null || encodedCursor.isBlank()) {
            return null;
        }

        try {
            String decoded = new String(
                    Base64.getUrlDecoder().decode(encodedCursor),
                    StandardCharsets.UTF_8
            );
            int separator = decoded.indexOf('|');
            if (separator <= 0 || separator == decoded.length() - 1) {
                throw new IllegalArgumentException("cursor separator");
            }
            return new TripCursor(
                    Instant.parse(decoded.substring(0, separator)),
                    UUID.fromString(decoded.substring(separator + 1))
            );
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "여행 목록 cursor가 올바르지 않습니다."
            );
        }
    }

    private record TripCursor(Instant createdAt, UUID id) {
    }
}
