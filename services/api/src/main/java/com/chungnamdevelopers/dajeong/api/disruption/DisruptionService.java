package com.chungnamdevelopers.dajeong.api.disruption;

import com.chungnamdevelopers.dajeong.api.error.ApiException;
import com.chungnamdevelopers.dajeong.api.identity.CurrentUserResponse;
import com.chungnamdevelopers.dajeong.api.trip.TripStatus;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class DisruptionService {

    private static final int MAX_IDEMPOTENCY_KEY_LENGTH = 200;

    private final ObjectProvider<JdbcClient> jdbcClientProvider;

    public DisruptionService(ObjectProvider<JdbcClient> jdbcClientProvider) {
        this.jdbcClientProvider = jdbcClientProvider;
    }

    @Transactional
    public DisruptionCreationResult create(
            CurrentUserResponse currentUser,
            UUID tripId,
            String idempotencyKey,
            CreateDisruptionRequest request
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        TripAccess trip = requireActiveMembership(
                jdbcClient,
                tripId,
                currentUser.id(),
                true
        );
        requireEditableTrip(trip.status());
        PublishedSlot slot = requireCurrentPublishedSlot(
                jdbcClient,
                tripId,
                request.itinerarySlotId()
        );
        String description = request.description().strip();
        String requestKeyHash = sha256(normalizeIdempotencyKey(idempotencyKey));
        String payloadHash = sha256(
                slot.slotId() + "\n" + request.type().name() + "\n" + description
        );

        Optional<ExistingCreateRequest> existing = jdbcClient.sql("""
                        select id, request_payload_hash
                        from public.disruption
                        where trip_id = :tripId
                          and reported_by_user_id = :userId
                          and creation_request_key_hash = :requestKeyHash
                        """)
                .param("tripId", tripId)
                .param("userId", currentUser.id())
                .param("requestKeyHash", requestKeyHash)
                .query((resultSet, rowNumber) -> new ExistingCreateRequest(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getString("request_payload_hash")
                ))
                .optional();
        if (existing.isPresent()) {
            if (!existing.get().payloadHash().equals(payloadHash)) {
                throw idempotencyConflict();
            }
            return new DisruptionCreationResult(
                    loadDisruption(jdbcClient, existing.get().id()),
                    false
            );
        }

        UUID disruptionId = UUID.randomUUID();
        jdbcClient.sql("""
                        insert into public.disruption (
                            id,
                            trip_id,
                            itinerary_version_id,
                            itinerary_slot_id,
                            reported_by_user_id,
                            type,
                            description,
                            status,
                            creation_request_key_hash,
                            request_payload_hash
                        )
                        values (
                            :id,
                            :tripId,
                            :versionId,
                            :slotId,
                            :userId,
                            :type,
                            :description,
                            'DETECTED',
                            :requestKeyHash,
                            :payloadHash
                        )
                        """)
                .param("id", disruptionId)
                .param("tripId", tripId)
                .param("versionId", slot.versionId())
                .param("slotId", slot.slotId())
                .param("userId", currentUser.id())
                .param("type", request.type().name())
                .param("description", description)
                .param("requestKeyHash", requestKeyHash)
                .param("payloadHash", payloadHash)
                .update();
        return new DisruptionCreationResult(
                loadDisruption(jdbcClient, disruptionId),
                true
        );
    }

    @Transactional(readOnly = true)
    public DisruptionListResponse list(CurrentUserResponse currentUser, UUID tripId) {
        JdbcClient jdbcClient = requireJdbcClient();
        requireActiveMembership(jdbcClient, tripId, currentUser.id(), false);
        List<DisruptionResponse> disruptions = jdbcClient.sql("""
                        select d.id
                        from public.disruption d
                        where d.trip_id = :tripId
                        order by d.reported_at desc, d.id desc
                        """)
                .param("tripId", tripId)
                .query(UUID.class)
                .list()
                .stream()
                .map(id -> loadDisruption(jdbcClient, id))
                .toList();
        return new DisruptionListResponse(tripId, disruptions);
    }

    @Transactional
    public DisruptionResponse dismiss(
            CurrentUserResponse currentUser,
            UUID disruptionId,
            String idempotencyKey
    ) {
        return transition(
                currentUser,
                disruptionId,
                idempotencyKey,
                DisruptionAction.DISMISS,
                DisruptionStatus.DISMISSED
        );
    }

    private DisruptionResponse transition(
            CurrentUserResponse currentUser,
            UUID disruptionId,
            String idempotencyKey,
            DisruptionAction action,
            DisruptionStatus targetStatus
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        TransitionAccess access = requireTransitionAccess(
                jdbcClient,
                disruptionId,
                currentUser.id()
        );
        requireEditableTrip(access.tripStatus());
        String requestKeyHash = sha256(normalizeIdempotencyKey(idempotencyKey));
        Optional<String> existingAction = jdbcClient.sql("""
                        select action
                        from public.disruption_action_request
                        where disruption_id = :disruptionId
                          and request_key_hash = :requestKeyHash
                        """)
                .param("disruptionId", disruptionId)
                .param("requestKeyHash", requestKeyHash)
                .query(String.class)
                .optional();
        if (existingAction.isPresent()) {
            if (!existingAction.get().equals(action.name())) {
                throw idempotencyConflict();
            }
            return loadDisruption(jdbcClient, disruptionId);
        }
        if (access.disruptionStatus() != DisruptionStatus.DETECTED
                && access.disruptionStatus() != targetStatus) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "DISRUPTION_ALREADY_RESOLVED",
                    "이미 다른 방식으로 처리된 문제입니다. 최신 상태를 확인해 주세요."
            );
        }

        jdbcClient.sql("""
                        insert into public.disruption_action_request (
                            disruption_id,
                            request_key_hash,
                            action
                        )
                        values (:disruptionId, :requestKeyHash, :action)
                        """)
                .param("disruptionId", disruptionId)
                .param("requestKeyHash", requestKeyHash)
                .param("action", action.name())
                .update();
        if (access.disruptionStatus() == DisruptionStatus.DETECTED) {
            jdbcClient.sql("""
                            update public.disruption
                            set status = :status,
                                updated_at = current_timestamp
                            where id = :disruptionId
                            """)
                    .param("status", targetStatus.name())
                    .param("disruptionId", disruptionId)
                    .update();
        }
        return loadDisruption(jdbcClient, disruptionId);
    }

    private TripAccess requireActiveMembership(
            JdbcClient jdbcClient,
            UUID tripId,
            UUID userId,
            boolean lock
    ) {
        String lockClause = lock ? " for update of t, m" : "";
        return jdbcClient.sql("""
                        select t.status
                        from public.trip t
                        join public.trip_membership m
                          on m.trip_id = t.id
                         and m.user_id = :userId
                         and m.status = 'ACTIVE'
                        where t.id = :tripId
                        """ + lockClause)
                .param("tripId", tripId)
                .param("userId", userId)
                .query((resultSet, rowNumber) -> new TripAccess(
                        TripStatus.valueOf(resultSet.getString("status"))
                ))
                .optional()
                .orElseThrow(this::forbidden);
    }

    private TransitionAccess requireTransitionAccess(
            JdbcClient jdbcClient,
            UUID disruptionId,
            UUID userId
    ) {
        return jdbcClient.sql("""
                        select t.status as trip_status, d.status as disruption_status
                        from public.disruption d
                        join public.trip t on t.id = d.trip_id
                        join public.trip_membership m
                          on m.trip_id = d.trip_id
                         and m.user_id = :userId
                         and m.status = 'ACTIVE'
                        where d.id = :disruptionId
                        for update of d, t, m
                        """)
                .param("disruptionId", disruptionId)
                .param("userId", userId)
                .query((resultSet, rowNumber) -> new TransitionAccess(
                        TripStatus.valueOf(resultSet.getString("trip_status")),
                        DisruptionStatus.valueOf(resultSet.getString("disruption_status"))
                ))
                .optional()
                .orElseThrow(this::forbidden);
    }

    private PublishedSlot requireCurrentPublishedSlot(
            JdbcClient jdbcClient,
            UUID tripId,
            UUID slotId
    ) {
        return jdbcClient.sql("""
                        select s.id as slot_id, v.id as version_id
                        from public.itinerary_slot s
                        join public.itinerary_version v
                          on v.id = s.itinerary_version_id
                        where v.trip_id = :tripId
                          and s.id = :slotId
                          and v.version_number = (
                              select max(current.version_number)
                              from public.itinerary_version current
                              where current.trip_id = :tripId
                          )
                        """)
                .param("tripId", tripId)
                .param("slotId", slotId)
                .query((resultSet, rowNumber) -> new PublishedSlot(
                        resultSet.getObject("version_id", UUID.class),
                        resultSet.getObject("slot_id", UUID.class)
                ))
                .optional()
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "DISRUPTION_SLOT_NOT_FOUND",
                        "현재 발행된 일정에서 신고할 슬롯을 찾을 수 없습니다."
                ));
    }

    private DisruptionResponse loadDisruption(JdbcClient jdbcClient, UUID id) {
        return jdbcClient.sql("""
                        select
                            d.id,
                            d.trip_id,
                            d.itinerary_version_id,
                            v.version_number,
                            d.itinerary_slot_id,
                            s.starts_at,
                            s.ends_at,
                            s.place_name,
                            d.type,
                            d.description,
                            d.reported_by_user_id,
                            coalesce(u.display_name, '기상청 단기예보') as reporter_display_name,
                            d.weather_grid_x,
                            d.weather_grid_y,
                            d.precipitation_probability,
                            d.forecast_at,
                            d.forecast_issued_at,
                            (
                                select ps.id
                                from public.proposal_set ps
                                where ps.disruption_id = d.id
                                order by ps.created_at desc, ps.id desc
                                limit 1
                            ) as proposal_set_id,
                            d.status,
                            d.reported_at,
                            d.updated_at
                        from public.disruption d
                        join public.itinerary_version v
                          on v.id = d.itinerary_version_id
                        join public.itinerary_slot s
                          on s.id = d.itinerary_slot_id
                        left join public.app_user u
                          on u.id = d.reported_by_user_id
                        where d.id = :id
                        """)
                .param("id", id)
                .query((resultSet, rowNumber) -> new DisruptionResponse(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getObject("trip_id", UUID.class),
                        resultSet.getObject("itinerary_version_id", UUID.class),
                        resultSet.getInt("version_number"),
                        resultSet.getObject("itinerary_slot_id", UUID.class),
                        resultSet.getObject("starts_at", Timestamp.class).toInstant(),
                        resultSet.getObject("ends_at", Timestamp.class).toInstant(),
                        resultSet.getString("place_name"),
                        DisruptionType.valueOf(resultSet.getString("type")),
                        resultSet.getString("description"),
                        resultSet.getObject("reported_by_user_id", UUID.class),
                        resultSet.getString("reporter_display_name"),
                        resultSet.getObject("weather_grid_x", Integer.class),
                        resultSet.getObject("weather_grid_y", Integer.class),
                        resultSet.getObject("precipitation_probability", Integer.class),
                        nullableInstant(resultSet.getObject("forecast_at", Timestamp.class)),
                        nullableInstant(resultSet.getObject("forecast_issued_at", Timestamp.class)),
                        resultSet.getObject("proposal_set_id", UUID.class),
                        DisruptionStatus.valueOf(resultSet.getString("status")),
                        resultSet.getObject("reported_at", Timestamp.class).toInstant(),
                        resultSet.getObject("updated_at", Timestamp.class).toInstant()
                ))
                .single();
    }

    private Instant nullableInstant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private void requireEditableTrip(TripStatus status) {
        if (status != TripStatus.DRAFT && status != TripStatus.ACTIVE) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "DISRUPTION_NOT_EDITABLE",
                    "완료되거나 보관된 여행에서는 문제를 신고하거나 처리할 수 없습니다."
            );
        }
    }

    private String normalizeIdempotencyKey(String value) {
        if (value == null || value.isBlank()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "IDEMPOTENCY_KEY_REQUIRED",
                    "Idempotency-Key가 필요합니다."
            );
        }
        String normalized = value.strip();
        if (normalized.length() > MAX_IDEMPOTENCY_KEY_LENGTH) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "IDEMPOTENCY_KEY_TOO_LONG",
                    "Idempotency-Key는 200자를 넘을 수 없습니다."
            );
        }
        return normalized;
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }

    private JdbcClient requireJdbcClient() {
        JdbcClient jdbcClient = jdbcClientProvider.getIfAvailable();
        if (jdbcClient == null) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "DISRUPTION_STORE_UNAVAILABLE",
                    "문제 신고 저장소가 구성되지 않았습니다."
            );
        }
        return jdbcClient;
    }

    private ApiException forbidden() {
        return new ApiException(
                HttpStatus.FORBIDDEN,
                "DISRUPTION_FORBIDDEN",
                "이 여행의 문제를 신고하거나 처리할 권한이 없습니다."
        );
    }

    private ApiException idempotencyConflict() {
        return new ApiException(
                HttpStatus.CONFLICT,
                "IDEMPOTENCY_KEY_REUSED",
                "같은 Idempotency-Key가 다른 문제 신고 요청에 사용되었습니다."
        );
    }

    private enum DisruptionAction {
        DISMISS
    }

    private record TripAccess(TripStatus status) {
    }

    private record TransitionAccess(
            TripStatus tripStatus,
            DisruptionStatus disruptionStatus
    ) {
    }

    private record PublishedSlot(UUID versionId, UUID slotId) {
    }

    private record ExistingCreateRequest(UUID id, String payloadHash) {
    }
}
