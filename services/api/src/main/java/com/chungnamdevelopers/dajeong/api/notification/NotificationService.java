package com.chungnamdevelopers.dajeong.api.notification;

import com.chungnamdevelopers.dajeong.api.error.ApiException;
import com.chungnamdevelopers.dajeong.api.identity.CurrentUserResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {

    private final ObjectProvider<JdbcClient> jdbcClientProvider;

    public NotificationService(ObjectProvider<JdbcClient> jdbcClientProvider) {
        this.jdbcClientProvider = jdbcClientProvider;
    }

    @Transactional(readOnly = true)
    public NotificationListResponse list(
            CurrentUserResponse currentUser,
            String encodedCursor,
            int limit
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        NotificationCursor cursor = decodeCursor(encodedCursor);
        String cursorPredicate = cursor == null
                ? ""
                : """
                   and (
                       n.created_at < :cursorCreatedAt
                       or (n.created_at = :cursorCreatedAt and n.id < :cursorId)
                   )
                   """;

        JdbcClient.StatementSpec statement = jdbcClient.sql("""
                        select
                            n.id,
                            n.type,
                            n.trip_id,
                            t.title as trip_title,
                            n.proposal_set_id,
                            n.itinerary_version_id,
                            v.version_number as itinerary_version_number,
                            ps.winner_proposal_id,
                            p.title as winner_title,
                            n.created_at,
                            n.read_at
                        from public.notification n
                        join public.trip t
                          on t.id = n.trip_id
                        join public.trip_membership m
                          on m.trip_id = n.trip_id
                         and m.user_id = n.user_id
                         and m.status = 'ACTIVE'
                        join public.itinerary_version v
                          on v.id = n.itinerary_version_id
                        join public.proposal_set ps
                          on ps.id = n.proposal_set_id
                         and ps.status = 'APPLIED'
                        join public.proposal p
                          on p.proposal_set_id = ps.id
                         and p.id = ps.winner_proposal_id
                        where n.user_id = :userId
                        """ + cursorPredicate + """
                        order by n.created_at desc, n.id desc
                        limit :queryLimit
                        """)
                .param("userId", currentUser.id())
                .param("queryLimit", limit + 1);
        if (cursor != null) {
            statement = statement
                    .param("cursorCreatedAt", Timestamp.from(cursor.createdAt()))
                    .param("cursorId", cursor.id());
        }

        List<NotificationResponse> rows = statement.query(this::mapNotification).list();
        boolean hasMore = rows.size() > limit;
        List<NotificationResponse> items = hasMore
                ? new ArrayList<>(rows.subList(0, limit))
                : rows;
        String nextCursor = hasMore
                ? encodeCursor(items.get(items.size() - 1))
                : null;
        return new NotificationListResponse(items, nextCursor);
    }

    @Transactional
    public NotificationResponse markRead(
            CurrentUserResponse currentUser,
            UUID notificationId,
            Instant readAt
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        int updated = jdbcClient.sql("""
                        update public.notification n
                        set read_at = coalesce(n.read_at, :readAt)
                        where n.id = :notificationId
                          and n.user_id = :userId
                          and exists (
                              select 1
                              from public.trip_membership m
                              where m.trip_id = n.trip_id
                                and m.user_id = n.user_id
                                and m.status = 'ACTIVE'
                          )
                        """)
                .param("readAt", Timestamp.from(readAt))
                .param("notificationId", notificationId)
                .param("userId", currentUser.id())
                .update();
        if (updated == 0) {
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    "NOTIFICATION_NOT_FOUND",
                    "알림을 찾을 수 없습니다."
            );
        }
        return load(jdbcClient, currentUser.id(), notificationId);
    }

    private NotificationResponse load(
            JdbcClient jdbcClient,
            UUID userId,
            UUID notificationId
    ) {
        return jdbcClient.sql("""
                        select
                            n.id,
                            n.type,
                            n.trip_id,
                            t.title as trip_title,
                            n.proposal_set_id,
                            n.itinerary_version_id,
                            v.version_number as itinerary_version_number,
                            ps.winner_proposal_id,
                            p.title as winner_title,
                            n.created_at,
                            n.read_at
                        from public.notification n
                        join public.trip t
                          on t.id = n.trip_id
                        join public.trip_membership m
                          on m.trip_id = n.trip_id
                         and m.user_id = n.user_id
                         and m.status = 'ACTIVE'
                        join public.itinerary_version v
                          on v.id = n.itinerary_version_id
                        join public.proposal_set ps
                          on ps.id = n.proposal_set_id
                         and ps.status = 'APPLIED'
                        join public.proposal p
                          on p.proposal_set_id = ps.id
                         and p.id = ps.winner_proposal_id
                        where n.id = :notificationId
                          and n.user_id = :userId
                        """)
                .param("notificationId", notificationId)
                .param("userId", userId)
                .query(this::mapNotification)
                .single();
    }

    private NotificationResponse mapNotification(
            java.sql.ResultSet resultSet,
            int rowNumber
    ) throws java.sql.SQLException {
        Timestamp readAt = resultSet.getObject("read_at", Timestamp.class);
        return new NotificationResponse(
                resultSet.getObject("id", UUID.class),
                NotificationType.valueOf(resultSet.getString("type")),
                resultSet.getObject("trip_id", UUID.class),
                resultSet.getString("trip_title"),
                resultSet.getObject("proposal_set_id", UUID.class),
                resultSet.getObject("itinerary_version_id", UUID.class),
                resultSet.getInt("itinerary_version_number"),
                resultSet.getObject("winner_proposal_id", UUID.class),
                resultSet.getString("winner_title"),
                resultSet.getObject("created_at", Timestamp.class).toInstant(),
                readAt == null ? null : readAt.toInstant()
        );
    }

    private String encodeCursor(NotificationResponse notification) {
        String value = notification.createdAt() + "|" + notification.id();
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private NotificationCursor decodeCursor(String encodedCursor) {
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
            return new NotificationCursor(
                    Instant.parse(decoded.substring(0, separator)),
                    UUID.fromString(decoded.substring(separator + 1))
            );
        } catch (IllegalArgumentException exception) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_NOTIFICATION_CURSOR",
                    "알림 목록 cursor가 올바르지 않습니다."
            );
        }
    }

    private JdbcClient requireJdbcClient() {
        JdbcClient jdbcClient = jdbcClientProvider.getIfAvailable();
        if (jdbcClient == null) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "NOTIFICATION_STORE_UNAVAILABLE",
                    "알림 저장소가 구성되지 않았습니다."
            );
        }
        return jdbcClient;
    }

    private record NotificationCursor(Instant createdAt, UUID id) {
    }
}
