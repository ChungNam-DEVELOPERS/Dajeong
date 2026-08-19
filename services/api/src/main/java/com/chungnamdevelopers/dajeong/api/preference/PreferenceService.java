package com.chungnamdevelopers.dajeong.api.preference;

import com.chungnamdevelopers.dajeong.api.error.ApiException;
import com.chungnamdevelopers.dajeong.api.identity.CurrentUserResponse;
import com.chungnamdevelopers.dajeong.api.trip.MembershipRole;
import com.chungnamdevelopers.dajeong.api.trip.TripStatus;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

@Service
public class PreferenceService {

    private final ObjectProvider<JdbcClient> jdbcClientProvider;

    public PreferenceService(ObjectProvider<JdbcClient> jdbcClientProvider) {
        this.jdbcClientProvider = jdbcClientProvider;
    }

    @Transactional
    public PrivatePreferenceResponse save(
            CurrentUserResponse currentUser,
            UUID tripId,
            PrivatePreferenceRequest request
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        MembershipAccess access = requireActiveMembership(
                jdbcClient,
                tripId,
                currentUser.id(),
                true
        );
        requireEditableTrip(access.status());
        requireUnique(request.preferredCategories(), "선호 관광 소재는 중복될 수 없습니다.");
        requireUnique(request.priorities(), "중요 기준은 중복될 수 없습니다.");

        jdbcClient.sql("""
                        insert into public.private_preference (
                            trip_id,
                            user_id,
                            budget_per_person,
                            activity_level,
                            travel_tolerance
                        )
                        values (
                            :tripId,
                            :userId,
                            :budgetPerPerson,
                            :activityLevel,
                            :travelTolerance
                        )
                        on conflict (trip_id, user_id) do update
                        set budget_per_person = excluded.budget_per_person,
                            activity_level = excluded.activity_level,
                            travel_tolerance = excluded.travel_tolerance,
                            updated_at = current_timestamp
                        """)
                .param("tripId", tripId)
                .param("userId", currentUser.id())
                .param("budgetPerPerson", request.budgetPerPerson())
                .param("activityLevel", request.activityLevel())
                .param("travelTolerance", request.travelTolerance())
                .update();

        jdbcClient.sql("""
                        delete from public.private_preference_category
                        where trip_id = :tripId
                          and user_id = :userId
                        """)
                .param("tripId", tripId)
                .param("userId", currentUser.id())
                .update();
        for (int index = 0; index < request.preferredCategories().size(); index++) {
            insertCategory(
                    jdbcClient,
                    tripId,
                    currentUser.id(),
                    request.preferredCategories().get(index),
                    index + 1
            );
        }

        jdbcClient.sql("""
                        delete from public.private_preference_priority
                        where trip_id = :tripId
                          and user_id = :userId
                        """)
                .param("tripId", tripId)
                .param("userId", currentUser.id())
                .update();
        for (int index = 0; index < request.priorities().size(); index++) {
            insertPriority(
                    jdbcClient,
                    tripId,
                    currentUser.id(),
                    request.priorities().get(index),
                    index + 1
            );
        }

        return loadPreference(jdbcClient, tripId, currentUser.id());
    }

    @Transactional(readOnly = true)
    public PrivatePreferenceResponse getMine(
            CurrentUserResponse currentUser,
            UUID tripId
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        requireActiveMembership(jdbcClient, tripId, currentUser.id(), false);
        return loadPreference(jdbcClient, tripId, currentUser.id());
    }

    @Transactional(readOnly = true)
    public PreferenceStatusResponse getStatus(
            CurrentUserResponse currentUser,
            UUID tripId
    ) {
        JdbcClient jdbcClient = requireJdbcClient();
        requireActiveMembership(jdbcClient, tripId, currentUser.id(), false);
        List<PreferenceMemberStatusResponse> members = jdbcClient.sql("""
                        select
                            u.id,
                            u.display_name,
                            m.role,
                            (p.user_id is not null) as submitted
                        from public.trip_membership m
                        join public.app_user u
                          on u.id = m.user_id
                        left join public.private_preference p
                          on p.trip_id = m.trip_id
                         and p.user_id = m.user_id
                        where m.trip_id = :tripId
                          and m.status = 'ACTIVE'
                        order by
                            case when m.role = 'HOST' then 0 else 1 end,
                            m.created_at,
                            m.id
                        """)
                .param("tripId", tripId)
                .query((resultSet, rowNumber) -> new PreferenceMemberStatusResponse(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getString("display_name"),
                        MembershipRole.valueOf(resultSet.getString("role")),
                        resultSet.getBoolean("submitted")
                ))
                .list();
        int submittedCount = (int) members.stream()
                .filter(PreferenceMemberStatusResponse::submitted)
                .count();
        return new PreferenceStatusResponse(
                tripId,
                submittedCount,
                members.size(),
                members
        );
    }

    private MembershipAccess requireActiveMembership(
            JdbcClient jdbcClient,
            UUID tripId,
            UUID userId,
            boolean lockMembership
    ) {
        String lockClause = lockMembership ? " for update of m" : "";
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
                .query((resultSet, rowNumber) -> new MembershipAccess(
                        TripStatus.valueOf(resultSet.getString("status"))
                ))
                .optional()
                .orElseThrow(this::forbidden);
    }

    private void requireEditableTrip(TripStatus status) {
        if (status != TripStatus.DRAFT && status != TripStatus.ACTIVE) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "PREFERENCE_NOT_EDITABLE",
                    "완료되거나 보관된 여행의 선호는 변경할 수 없습니다."
            );
        }
    }

    private <Value> void requireUnique(List<Value> values, String message) {
        if (new HashSet<>(values).size() != values.size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PREFERENCE", message);
        }
    }

    private void insertCategory(
            JdbcClient jdbcClient,
            UUID tripId,
            UUID userId,
            PreferenceCategory category,
            int selectionOrder
    ) {
        jdbcClient.sql("""
                        insert into public.private_preference_category (
                            trip_id,
                            user_id,
                            category,
                            selection_order
                        )
                        values (:tripId, :userId, :category, :selectionOrder)
                        """)
                .param("tripId", tripId)
                .param("userId", userId)
                .param("category", category.name())
                .param("selectionOrder", selectionOrder)
                .update();
    }

    private void insertPriority(
            JdbcClient jdbcClient,
            UUID tripId,
            UUID userId,
            PreferencePriority priority,
            int selectionOrder
    ) {
        jdbcClient.sql("""
                        insert into public.private_preference_priority (
                            trip_id,
                            user_id,
                            priority,
                            selection_order
                        )
                        values (:tripId, :userId, :priority, :selectionOrder)
                        """)
                .param("tripId", tripId)
                .param("userId", userId)
                .param("priority", priority.name())
                .param("selectionOrder", selectionOrder)
                .update();
    }

    private PrivatePreferenceResponse loadPreference(
            JdbcClient jdbcClient,
            UUID tripId,
            UUID userId
    ) {
        PreferenceRow preference = jdbcClient.sql("""
                        select
                            budget_per_person,
                            activity_level,
                            travel_tolerance,
                            submitted_at,
                            updated_at
                        from public.private_preference
                        where trip_id = :tripId
                          and user_id = :userId
                        """)
                .param("tripId", tripId)
                .param("userId", userId)
                .query((resultSet, rowNumber) -> new PreferenceRow(
                        resultSet.getInt("budget_per_person"),
                        resultSet.getInt("activity_level"),
                        resultSet.getInt("travel_tolerance"),
                        resultSet.getObject("submitted_at", Timestamp.class).toInstant(),
                        resultSet.getObject("updated_at", Timestamp.class).toInstant()
                ))
                .optional()
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "PREFERENCE_NOT_SUBMITTED",
                        "아직 제출한 선호가 없습니다."
                ));
        List<PreferenceCategory> categories = jdbcClient.sql("""
                        select category
                        from public.private_preference_category
                        where trip_id = :tripId
                          and user_id = :userId
                        order by selection_order
                        """)
                .param("tripId", tripId)
                .param("userId", userId)
                .query(String.class)
                .list()
                .stream()
                .map(PreferenceCategory::valueOf)
                .toList();
        List<PreferencePriority> priorities = jdbcClient.sql("""
                        select priority
                        from public.private_preference_priority
                        where trip_id = :tripId
                          and user_id = :userId
                        order by selection_order
                        """)
                .param("tripId", tripId)
                .param("userId", userId)
                .query(String.class)
                .list()
                .stream()
                .map(PreferencePriority::valueOf)
                .toList();
        return new PrivatePreferenceResponse(
                tripId,
                userId,
                preference.budgetPerPerson(),
                preference.activityLevel(),
                preference.travelTolerance(),
                categories,
                priorities,
                preference.submittedAt(),
                preference.updatedAt()
        );
    }

    private JdbcClient requireJdbcClient() {
        JdbcClient jdbcClient = jdbcClientProvider.getIfAvailable();
        if (jdbcClient == null) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "PREFERENCE_STORE_UNAVAILABLE",
                    "선호 저장소가 구성되지 않았습니다."
            );
        }
        return jdbcClient;
    }

    private ApiException forbidden() {
        return new ApiException(
                HttpStatus.FORBIDDEN,
                "PREFERENCE_FORBIDDEN",
                "이 여행의 선호를 조회하거나 변경할 권한이 없습니다."
        );
    }

    private record MembershipAccess(TripStatus status) {
    }

    private record PreferenceRow(
            int budgetPerPerson,
            int activityLevel,
            int travelTolerance,
            Instant submittedAt,
            Instant updatedAt
    ) {
    }
}
