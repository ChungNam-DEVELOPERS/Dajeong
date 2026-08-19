package com.chungnamdevelopers.dajeong.api.itinerary;

import com.chungnamdevelopers.dajeong.api.error.ApiException;
import com.chungnamdevelopers.dajeong.api.identity.CurrentUserResponse;
import com.chungnamdevelopers.dajeong.api.trip.MembershipRole;
import com.chungnamdevelopers.dajeong.api.trip.TripStatus;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ItineraryService {

    private static final int MAX_IDEMPOTENCY_KEY_LENGTH = 200;
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final ObjectProvider<JdbcClient> jdbcClientProvider;

    public ItineraryService(ObjectProvider<JdbcClient> jdbcClientProvider) {
        this.jdbcClientProvider = jdbcClientProvider;
    }

    @Transactional
    public ItineraryDraftResponse getDraft(
            CurrentUserResponse currentUser,
            UUID tripId
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        requireEditableHost(jdbcClient, tripId, currentUser.id(), false);
        ensureDraft(jdbcClient, tripId);
        return loadDraft(jdbcClient, tripId);
    }

    @Transactional(readOnly = true)
    public ItineraryVersionResponse getCurrent(
            CurrentUserResponse currentUser,
            UUID tripId
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        requireActiveMembership(jdbcClient, tripId, currentUser.id());
        UUID versionId = jdbcClient.sql("""
                        select id
                        from public.itinerary_version
                        where trip_id = :tripId
                        order by version_number desc
                        limit 1
                        """)
                .param("tripId", tripId)
                .query(UUID.class)
                .optional()
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "ITINERARY_NOT_PUBLISHED",
                        "아직 발행된 일정이 없습니다."
                ));
        return loadVersion(jdbcClient, versionId);
    }

    @Transactional
    public DraftMutationResult addSlot(
            CurrentUserResponse currentUser,
            UUID tripId,
            long expectedRevision,
            String idempotencyKey,
            ItinerarySlotRequest request
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        TripAccess trip = requireEditableHost(
                jdbcClient,
                tripId,
                currentUser.id(),
                true
        );
        ensureDraft(jdbcClient, tripId);
        DraftState draft = lockDraft(jdbcClient, tripId);
        NormalizedSlotInput input = normalizeSlot(request);
        String requestKeyHash = sha256(normalizeIdempotencyKey(idempotencyKey));
        String requestPayloadHash = slotRequestHash(input);

        Optional<String> existingPayloadHash = findDraftSlotRequest(
                jdbcClient,
                tripId,
                requestKeyHash
        );
        if (existingPayloadHash.isPresent()) {
            if (!existingPayloadHash.get().equals(requestPayloadHash)) {
                throw idempotencyConflict();
            }
            return new DraftMutationResult(loadDraft(jdbcClient, tripId), false);
        }

        requireRevision(draft.revision(), expectedRevision);
        validateSlot(jdbcClient, trip, input, null);

        jdbcClient.sql("""
                        insert into public.itinerary_draft_slot (
                            id,
                            trip_id,
                            starts_at,
                            ends_at,
                            place_name,
                            address,
                            latitude,
                            longitude,
                            indoor,
                            category,
                            expected_cost,
                            source
                        )
                        values (
                            :id,
                            :tripId,
                            :startsAt,
                            :endsAt,
                            :placeName,
                            :address,
                            :latitude,
                            :longitude,
                            :indoor,
                            :category,
                            :expectedCost,
                            'MANUAL'
                        )
                        """)
                .param("id", UUID.randomUUID())
                .param("tripId", tripId)
                .param("startsAt", Timestamp.from(input.startsAt()))
                .param("endsAt", Timestamp.from(input.endsAt()))
                .param("placeName", input.placeName())
                .param("address", input.address())
                .param("latitude", input.latitude())
                .param("longitude", input.longitude())
                .param("indoor", input.indoor())
                .param("category", input.category().name())
                .param("expectedCost", input.expectedCost())
                .update();
        jdbcClient.sql("""
                        insert into public.itinerary_draft_slot_request (
                            trip_id,
                            request_key_hash,
                            request_payload_hash
                        )
                        values (:tripId, :requestKeyHash, :requestPayloadHash)
                        """)
                .param("tripId", tripId)
                .param("requestKeyHash", requestKeyHash)
                .param("requestPayloadHash", requestPayloadHash)
                .update();
        incrementDraftRevision(jdbcClient, tripId);
        return new DraftMutationResult(loadDraft(jdbcClient, tripId), true);
    }

    @Transactional
    public ItineraryDraftResponse updateSlot(
            CurrentUserResponse currentUser,
            UUID tripId,
            UUID slotId,
            long expectedRevision,
            ItinerarySlotRequest request
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        TripAccess trip = requireEditableHost(
                jdbcClient,
                tripId,
                currentUser.id(),
                true
        );
        ensureDraft(jdbcClient, tripId);
        DraftState draft = lockDraft(jdbcClient, tripId);
        requireRevision(draft.revision(), expectedRevision);
        requireDraftSlot(jdbcClient, tripId, slotId);

        NormalizedSlotInput input = normalizeSlot(request);
        validateSlot(jdbcClient, trip, input, slotId);
        jdbcClient.sql("""
                        update public.itinerary_draft_slot
                        set starts_at = :startsAt,
                            ends_at = :endsAt,
                            place_name = :placeName,
                            address = :address,
                            latitude = :latitude,
                            longitude = :longitude,
                            indoor = :indoor,
                            category = :category,
                            expected_cost = :expectedCost,
                            updated_at = current_timestamp
                        where trip_id = :tripId
                          and id = :slotId
                        """)
                .param("startsAt", Timestamp.from(input.startsAt()))
                .param("endsAt", Timestamp.from(input.endsAt()))
                .param("placeName", input.placeName())
                .param("address", input.address())
                .param("latitude", input.latitude())
                .param("longitude", input.longitude())
                .param("indoor", input.indoor())
                .param("category", input.category().name())
                .param("expectedCost", input.expectedCost())
                .param("tripId", tripId)
                .param("slotId", slotId)
                .update();
        incrementDraftRevision(jdbcClient, tripId);
        return loadDraft(jdbcClient, tripId);
    }

    @Transactional
    public ItineraryDraftResponse deleteSlot(
            CurrentUserResponse currentUser,
            UUID tripId,
            UUID slotId,
            long expectedRevision
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        requireEditableHost(jdbcClient, tripId, currentUser.id(), true);
        ensureDraft(jdbcClient, tripId);
        DraftState draft = lockDraft(jdbcClient, tripId);
        requireRevision(draft.revision(), expectedRevision);
        requireDraftSlot(jdbcClient, tripId, slotId);

        jdbcClient.sql("""
                        delete from public.itinerary_draft_slot
                        where trip_id = :tripId
                          and id = :slotId
                        """)
                .param("tripId", tripId)
                .param("slotId", slotId)
                .update();
        incrementDraftRevision(jdbcClient, tripId);
        return loadDraft(jdbcClient, tripId);
    }

    @Transactional
    public PublishItineraryResult publish(
            CurrentUserResponse currentUser,
            UUID tripId,
            long expectedRevision,
            String idempotencyKey
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        requireEditableHost(jdbcClient, tripId, currentUser.id(), true);
        ensureDraft(jdbcClient, tripId);
        DraftState draft = lockDraft(jdbcClient, tripId);
        String requestKeyHash = sha256(normalizeIdempotencyKey(idempotencyKey));

        Optional<PublishedRequest> existing = jdbcClient.sql("""
                        select id, draft_revision
                        from public.itinerary_version
                        where trip_id = :tripId
                          and publish_request_key_hash = :requestKeyHash
                        """)
                .param("tripId", tripId)
                .param("requestKeyHash", requestKeyHash)
                .query((resultSet, rowNumber) -> new PublishedRequest(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getLong("draft_revision")
                ))
                .optional();
        if (existing.isPresent()) {
            if (existing.get().draftRevision() != expectedRevision) {
                throw idempotencyConflict();
            }
            return new PublishItineraryResult(
                    loadVersion(jdbcClient, existing.get().versionId()),
                    false
            );
        }

        requireRevision(draft.revision(), expectedRevision);
        List<ItinerarySlotResponse> slots = loadDraftSlots(jdbcClient, tripId);
        if (slots.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "ITINERARY_EMPTY",
                    "일정을 발행하려면 슬롯을 1개 이상 추가해 주세요."
            );
        }
        if (draft.publishedRevision() != null
                && draft.publishedRevision() == draft.revision()) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "ITINERARY_UNCHANGED",
                    "마지막 발행 이후 변경된 일정이 없습니다."
            );
        }

        Optional<VersionPointer> previous = jdbcClient.sql("""
                        select id, version_number
                        from public.itinerary_version
                        where trip_id = :tripId
                        order by version_number desc
                        limit 1
                        """)
                .param("tripId", tripId)
                .query((resultSet, rowNumber) -> new VersionPointer(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getInt("version_number")
                ))
                .optional();
        UUID versionId = UUID.randomUUID();
        int versionNumber = previous.map(pointer -> pointer.versionNumber() + 1)
                .orElse(1);

        jdbcClient.sql("""
                        insert into public.itinerary_version (
                            id,
                            trip_id,
                            version_number,
                            reason,
                            previous_version_id,
                            draft_revision,
                            published_by_user_id,
                            publish_request_key_hash
                        )
                        values (
                            :id,
                            :tripId,
                            :versionNumber,
                            'ORIGINAL',
                            :previousVersionId,
                            :draftRevision,
                            :publishedByUserId,
                            :requestKeyHash
                        )
                        """)
                .param("id", versionId)
                .param("tripId", tripId)
                .param("versionNumber", versionNumber)
                .param("previousVersionId", previous.map(VersionPointer::id).orElse(null))
                .param("draftRevision", draft.revision())
                .param("publishedByUserId", currentUser.id())
                .param("requestKeyHash", requestKeyHash)
                .update();

        for (ItinerarySlotResponse slot : slots) {
            insertPublishedSlot(jdbcClient, versionId, slot);
        }

        jdbcClient.sql("""
                        update public.itinerary_draft
                        set published_revision = revision,
                            updated_at = current_timestamp
                        where trip_id = :tripId
                        """)
                .param("tripId", tripId)
                .update();
        return new PublishItineraryResult(loadVersion(jdbcClient, versionId), true);
    }

    private TripAccess requireEditableHost(
            JdbcClient jdbcClient,
            UUID tripId,
            UUID userId,
            boolean lockTrip
    ) {
        TripAccess trip = loadTripAccess(jdbcClient, tripId, userId, lockTrip);
        if (trip.role() != MembershipRole.HOST) {
            throw forbidden();
        }
        if (trip.status() != TripStatus.DRAFT && trip.status() != TripStatus.ACTIVE) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "TRIP_NOT_EDITABLE",
                    "완료되거나 보관된 여행의 일정은 편집할 수 없습니다."
            );
        }
        return trip;
    }

    private void requireActiveMembership(
            JdbcClient jdbcClient,
            UUID tripId,
            UUID userId
    ) {
        loadTripAccess(jdbcClient, tripId, userId, false);
    }

    private TripAccess loadTripAccess(
            JdbcClient jdbcClient,
            UUID tripId,
            UUID userId,
            boolean lockTrip
    ) {
        String lockClause = lockTrip ? " for update of t" : "";
        return jdbcClient.sql("""
                        select t.id, t.start_date, t.end_date, t.status, m.role
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
                        resultSet.getObject("id", UUID.class),
                        resultSet.getObject("start_date", LocalDate.class),
                        resultSet.getObject("end_date", LocalDate.class),
                        TripStatus.valueOf(resultSet.getString("status")),
                        MembershipRole.valueOf(resultSet.getString("role"))
                ))
                .optional()
                .orElseThrow(this::forbidden);
    }

    private void ensureDraft(JdbcClient jdbcClient, UUID tripId) {
        jdbcClient.sql("""
                        insert into public.itinerary_draft (trip_id)
                        values (:tripId)
                        on conflict (trip_id) do nothing
                        """)
                .param("tripId", tripId)
                .update();
    }

    private DraftState lockDraft(JdbcClient jdbcClient, UUID tripId) {
        return jdbcClient.sql("""
                        select revision, published_revision
                        from public.itinerary_draft
                        where trip_id = :tripId
                        for update
                        """)
                .param("tripId", tripId)
                .query((resultSet, rowNumber) -> new DraftState(
                        resultSet.getLong("revision"),
                        resultSet.getObject("published_revision", Long.class)
                ))
                .single();
    }

    private ItineraryDraftResponse loadDraft(JdbcClient jdbcClient, UUID tripId) {
        DraftState state = jdbcClient.sql("""
                        select revision, published_revision
                        from public.itinerary_draft
                        where trip_id = :tripId
                        """)
                .param("tripId", tripId)
                .query((resultSet, rowNumber) -> new DraftState(
                        resultSet.getLong("revision"),
                        resultSet.getObject("published_revision", Long.class)
                ))
                .single();
        return new ItineraryDraftResponse(
                tripId,
                state.revision(),
                state.publishedRevision(),
                loadDraftSlots(jdbcClient, tripId)
        );
    }

    private List<ItinerarySlotResponse> loadDraftSlots(
            JdbcClient jdbcClient,
            UUID tripId
    ) {
        return jdbcClient.sql("""
                        select
                            id,
                            starts_at,
                            ends_at,
                            place_name,
                            address,
                            latitude,
                            longitude,
                            indoor,
                            category,
                            expected_cost
                        from public.itinerary_draft_slot
                        where trip_id = :tripId
                        order by starts_at, id
                        """)
                .param("tripId", tripId)
                .query(this::mapSlot)
                .list();
    }

    private Optional<String> findDraftSlotRequest(
            JdbcClient jdbcClient,
            UUID tripId,
            String requestKeyHash
    ) {
        return jdbcClient.sql("""
                        select request_payload_hash
                        from public.itinerary_draft_slot_request
                        where trip_id = :tripId
                          and request_key_hash = :requestKeyHash
                        """)
                .param("tripId", tripId)
                .param("requestKeyHash", requestKeyHash)
                .query(String.class)
                .optional();
    }

    private void requireDraftSlot(
            JdbcClient jdbcClient,
            UUID tripId,
            UUID slotId
    ) {
        boolean exists = jdbcClient.sql("""
                        select exists (
                            select 1
                            from public.itinerary_draft_slot
                            where trip_id = :tripId
                              and id = :slotId
                        )
                        """)
                .param("tripId", tripId)
                .param("slotId", slotId)
                .query(Boolean.class)
                .single();
        if (!exists) {
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    "ITINERARY_SLOT_NOT_FOUND",
                    "일정 슬롯을 찾을 수 없습니다."
            );
        }
    }

    private void validateSlot(
            JdbcClient jdbcClient,
            TripAccess trip,
            NormalizedSlotInput input,
            UUID excludedSlotId
    ) {
        if (!input.endsAt().isAfter(input.startsAt())) {
            throw invalidSlot("일정 종료 시각은 시작 시각보다 늦어야 합니다.");
        }

        LocalDate localStartDate = input.startsAt().atZone(SEOUL).toLocalDate();
        LocalDate localEndDate = input.endsAt().atZone(SEOUL).toLocalDate();
        if (localStartDate.isBefore(trip.startDate())
                || localEndDate.isAfter(trip.endDate())) {
            throw invalidSlot("일정 시각은 여행 기간 안에 있어야 합니다.");
        }

        String exclusion = excludedSlotId == null ? "" : " and id <> :excludedSlotId";
        JdbcClient.StatementSpec statement = jdbcClient.sql("""
                        select count(*)
                        from public.itinerary_draft_slot
                        where trip_id = :tripId
                          and starts_at < :endsAt
                          and ends_at > :startsAt
                        """ + exclusion)
                .param("tripId", trip.tripId())
                .param("startsAt", Timestamp.from(input.startsAt()))
                .param("endsAt", Timestamp.from(input.endsAt()));
        if (excludedSlotId != null) {
            statement = statement.param("excludedSlotId", excludedSlotId);
        }
        if (statement.query(Integer.class).single() > 0) {
            throw invalidSlot("같은 시간대에 겹치는 일정이 있습니다.");
        }
    }

    private NormalizedSlotInput normalizeSlot(ItinerarySlotRequest request) {
        if ((request.latitude() == null) != (request.longitude() == null)) {
            throw invalidSlot("위도와 경도는 함께 입력하거나 둘 다 비워야 합니다.");
        }
        return new NormalizedSlotInput(
                request.startsAt().toInstant(),
                request.endsAt().toInstant(),
                request.placeName().strip(),
                request.address().strip(),
                normalizeCoordinate(request.latitude()),
                normalizeCoordinate(request.longitude()),
                request.indoor(),
                request.category(),
                request.expectedCost()
        );
    }

    private BigDecimal normalizeCoordinate(BigDecimal value) {
        return value == null ? null : value.setScale(6, RoundingMode.HALF_UP);
    }

    private void incrementDraftRevision(JdbcClient jdbcClient, UUID tripId) {
        jdbcClient.sql("""
                        update public.itinerary_draft
                        set revision = revision + 1,
                            updated_at = current_timestamp
                        where trip_id = :tripId
                        """)
                .param("tripId", tripId)
                .update();
    }

    private void insertPublishedSlot(
            JdbcClient jdbcClient,
            UUID versionId,
            ItinerarySlotResponse slot
    ) {
        jdbcClient.sql("""
                        insert into public.itinerary_slot (
                            id,
                            itinerary_version_id,
                            source_draft_slot_id,
                            starts_at,
                            ends_at,
                            place_name,
                            address,
                            latitude,
                            longitude,
                            indoor,
                            category,
                            expected_cost,
                            source
                        )
                        values (
                            :id,
                            :versionId,
                            :sourceDraftSlotId,
                            :startsAt,
                            :endsAt,
                            :placeName,
                            :address,
                            :latitude,
                            :longitude,
                            :indoor,
                            :category,
                            :expectedCost,
                            'MANUAL'
                        )
                        """)
                .param("id", UUID.randomUUID())
                .param("versionId", versionId)
                .param("sourceDraftSlotId", slot.id())
                .param("startsAt", Timestamp.from(slot.startsAt()))
                .param("endsAt", Timestamp.from(slot.endsAt()))
                .param("placeName", slot.placeName())
                .param("address", slot.address())
                .param("latitude", slot.latitude())
                .param("longitude", slot.longitude())
                .param("indoor", slot.indoor())
                .param("category", slot.category().name())
                .param("expectedCost", slot.expectedCost())
                .update();
    }

    private ItineraryVersionResponse loadVersion(
            JdbcClient jdbcClient,
            UUID versionId
    ) {
        VersionState version = jdbcClient.sql("""
                        select
                            v.id,
                            v.trip_id,
                            v.version_number,
                            v.reason,
                            previous.version_number as previous_version_number,
                            v.draft_revision,
                            v.published_at
                        from public.itinerary_version v
                        left join public.itinerary_version previous
                          on previous.id = v.previous_version_id
                        where v.id = :versionId
                        """)
                .param("versionId", versionId)
                .query((resultSet, rowNumber) -> new VersionState(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getObject("trip_id", UUID.class),
                        resultSet.getInt("version_number"),
                        ItineraryReason.valueOf(resultSet.getString("reason")),
                        resultSet.getObject("previous_version_number", Integer.class),
                        resultSet.getLong("draft_revision"),
                        resultSet.getObject("published_at", Timestamp.class).toInstant()
                ))
                .single();
        List<ItinerarySlotResponse> slots = jdbcClient.sql("""
                        select
                            id,
                            starts_at,
                            ends_at,
                            place_name,
                            address,
                            latitude,
                            longitude,
                            indoor,
                            category,
                            expected_cost
                        from public.itinerary_slot
                        where itinerary_version_id = :versionId
                        order by starts_at, id
                        """)
                .param("versionId", versionId)
                .query(this::mapSlot)
                .list();
        return new ItineraryVersionResponse(
                version.id(),
                version.tripId(),
                version.versionNumber(),
                version.reason(),
                version.previousVersionNumber(),
                version.draftRevision(),
                version.publishedAt(),
                slots
        );
    }

    private ItinerarySlotResponse mapSlot(
            java.sql.ResultSet resultSet,
            int rowNumber
    ) throws java.sql.SQLException {
        return new ItinerarySlotResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject("starts_at", Timestamp.class).toInstant(),
                resultSet.getObject("ends_at", Timestamp.class).toInstant(),
                resultSet.getString("place_name"),
                resultSet.getString("address"),
                resultSet.getBigDecimal("latitude"),
                resultSet.getBigDecimal("longitude"),
                resultSet.getBoolean("indoor"),
                ItineraryCategory.valueOf(resultSet.getString("category")),
                resultSet.getInt("expected_cost")
        );
    }

    private JdbcClient requireJdbcClient() {
        JdbcClient jdbcClient = jdbcClientProvider.getIfAvailable();
        if (jdbcClient == null) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "ITINERARY_STORE_UNAVAILABLE",
                    "일정 저장소가 구성되지 않았습니다."
            );
        }
        return jdbcClient;
    }

    private void requireRevision(long currentRevision, long expectedRevision) {
        if (currentRevision != expectedRevision) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "STALE_VERSION",
                    "일정이 다른 곳에서 변경되었습니다. 최신 초안을 다시 불러와 주세요."
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
                    "IDEMPOTENCY_KEY_INVALID",
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

    private String slotRequestHash(NormalizedSlotInput input) {
        StringBuilder canonical = new StringBuilder();
        appendCanonical(canonical, input.startsAt().toString());
        appendCanonical(canonical, input.endsAt().toString());
        appendCanonical(canonical, input.placeName());
        appendCanonical(canonical, input.address());
        appendCanonical(
                canonical,
                input.latitude() == null ? null : input.latitude().toPlainString()
        );
        appendCanonical(
                canonical,
                input.longitude() == null ? null : input.longitude().toPlainString()
        );
        appendCanonical(canonical, Boolean.toString(input.indoor()));
        appendCanonical(canonical, input.category().name());
        appendCanonical(canonical, Integer.toString(input.expectedCost()));
        return sha256(canonical.toString());
    }

    private void appendCanonical(StringBuilder target, String value) {
        if (value == null) {
            target.append("-1:");
            return;
        }
        target.append(value.length()).append(':').append(value);
    }

    private ApiException forbidden() {
        return new ApiException(
                HttpStatus.FORBIDDEN,
                "ITINERARY_FORBIDDEN",
                "이 여행의 일정을 변경하거나 조회할 권한이 없습니다."
        );
    }

    private ApiException invalidSlot(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ITINERARY_SLOT", message);
    }

    private ApiException idempotencyConflict() {
        return new ApiException(
                HttpStatus.CONFLICT,
                "IDEMPOTENCY_CONFLICT",
                "같은 Idempotency-Key가 다른 일정 요청에 사용되었습니다."
        );
    }

    private record DraftState(long revision, Long publishedRevision) {
    }

    private record NormalizedSlotInput(
            Instant startsAt,
            Instant endsAt,
            String placeName,
            String address,
            BigDecimal latitude,
            BigDecimal longitude,
            boolean indoor,
            ItineraryCategory category,
            int expectedCost
    ) {
    }

    private record PublishedRequest(UUID versionId, long draftRevision) {
    }

    private record TripAccess(
            UUID tripId,
            LocalDate startDate,
            LocalDate endDate,
            TripStatus status,
            MembershipRole role
    ) {
    }

    private record VersionPointer(UUID id, int versionNumber) {
    }

    private record VersionState(
            UUID id,
            UUID tripId,
            int versionNumber,
            ItineraryReason reason,
            Integer previousVersionNumber,
            long draftRevision,
            Instant publishedAt
    ) {
    }
}
