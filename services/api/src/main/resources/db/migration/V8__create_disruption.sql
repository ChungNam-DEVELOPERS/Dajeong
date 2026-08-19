create table public.disruption (
    id uuid primary key,
    trip_id uuid not null references public.trip (id) on delete cascade,
    itinerary_version_id uuid not null references public.itinerary_version (id),
    itinerary_slot_id uuid not null references public.itinerary_slot (id),
    reported_by_user_id uuid not null references public.app_user (id),
    type varchar(20) not null,
    description varchar(200) not null,
    status varchar(20) not null default 'DETECTED',
    creation_request_key_hash char(64) not null,
    request_payload_hash char(64) not null,
    reported_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint disruption_type_check check (
        type in ('CLOSURE', 'TRAFFIC', 'OTHER')
    ),
    constraint disruption_description_check check (
        char_length(btrim(description)) between 1 and 200
    ),
    constraint disruption_status_check check (
        status in ('DETECTED', 'ACKNOWLEDGED', 'DISMISSED')
    ),
    constraint disruption_creation_request_unique unique (
        trip_id,
        reported_by_user_id,
        creation_request_key_hash
    )
);

create index disruption_trip_reported_idx
    on public.disruption (trip_id, reported_at desc, id desc);

create table public.disruption_action_request (
    disruption_id uuid not null references public.disruption (id) on delete cascade,
    request_key_hash char(64) not null,
    action varchar(20) not null,
    created_at timestamptz not null default current_timestamp,
    primary key (disruption_id, request_key_hash),
    constraint disruption_action_check check (
        action in ('DISMISS', 'START_REPLAN')
    )
);

comment on table public.disruption is
    'Manual disruption reports tied to the latest published itinerary slot';

comment on table public.disruption_action_request is
    'Idempotency records for dismissing or acknowledging a disruption';
