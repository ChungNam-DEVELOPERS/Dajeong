create table public.private_preference (
    trip_id uuid not null references public.trip (id) on delete cascade,
    user_id uuid not null references public.app_user (id),
    budget_per_person integer not null,
    activity_level smallint not null,
    travel_tolerance smallint not null,
    submitted_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    primary key (trip_id, user_id),
    constraint private_preference_budget_check check (
        budget_per_person between 0 and 100000000
    ),
    constraint private_preference_activity_check check (
        activity_level between 1 and 5
    ),
    constraint private_preference_travel_check check (
        travel_tolerance between 1 and 5
    )
);

create table public.private_preference_category (
    trip_id uuid not null,
    user_id uuid not null,
    category varchar(30) not null,
    selection_order smallint not null,
    primary key (trip_id, user_id, category),
    constraint private_preference_category_owner_fk
        foreign key (trip_id, user_id)
        references public.private_preference (trip_id, user_id)
        on delete cascade,
    constraint private_preference_category_value_check check (
        category in (
            'NATURE',
            'FOOD',
            'CAFE',
            'CULTURE',
            'SHOPPING',
            'ACTIVITY',
            'EXPERIENCE'
        )
    ),
    constraint private_preference_category_order_check check (
        selection_order between 1 and 7
    ),
    constraint private_preference_category_order_unique unique (
        trip_id,
        user_id,
        selection_order
    )
);

create table public.private_preference_priority (
    trip_id uuid not null,
    user_id uuid not null,
    priority varchar(40) not null,
    selection_order smallint not null,
    primary key (trip_id, user_id, priority),
    constraint private_preference_priority_owner_fk
        foreign key (trip_id, user_id)
        references public.private_preference (trip_id, user_id)
        on delete cascade,
    constraint private_preference_priority_value_check check (
        priority in (
            'FLEXIBLE_SCHEDULE',
            'NATURE_HEALING',
            'FOOD_EXPLORATION',
            'MINIMIZE_TRAVEL',
            'SAVE_BUDGET'
        )
    ),
    constraint private_preference_priority_order_check check (
        selection_order between 1 and 2
    ),
    constraint private_preference_priority_order_unique unique (
        trip_id,
        user_id,
        selection_order
    )
);

comment on table public.private_preference is
    'Latest private preference response visible only to its active member';

comment on table public.private_preference_category is
    'Ordered private category selections excluded from group status responses';

comment on table public.private_preference_priority is
    'Up to two ordered private decision priorities';
