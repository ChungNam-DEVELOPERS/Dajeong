create table public.itinerary_draft (
    trip_id uuid primary key references public.trip (id) on delete cascade,
    revision bigint not null default 0,
    published_revision bigint,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint itinerary_draft_revision_check check (revision >= 0),
    constraint itinerary_draft_published_revision_check check (
        published_revision is null
        or (published_revision >= 0 and published_revision <= revision)
    )
);

create table public.itinerary_draft_slot_request (
    trip_id uuid not null references public.itinerary_draft (trip_id) on delete cascade,
    request_key_hash char(64) not null,
    request_payload_hash char(64) not null,
    created_at timestamptz not null default current_timestamp,
    primary key (trip_id, request_key_hash)
);

create table public.itinerary_draft_slot (
    id uuid primary key,
    trip_id uuid not null references public.itinerary_draft (trip_id) on delete cascade,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    place_name varchar(120) not null,
    address varchar(240) not null,
    latitude numeric(9, 6),
    longitude numeric(9, 6),
    indoor boolean not null,
    category varchar(30) not null,
    expected_cost integer not null default 0,
    source varchar(20) not null default 'MANUAL',
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint itinerary_draft_slot_time_check check (ends_at > starts_at),
    constraint itinerary_draft_slot_place_name_check check (
        char_length(btrim(place_name)) between 1 and 120
    ),
    constraint itinerary_draft_slot_address_check check (
        char_length(btrim(address)) between 1 and 240
    ),
    constraint itinerary_draft_slot_coordinate_pair_check check (
        (latitude is null and longitude is null)
        or (latitude is not null and longitude is not null)
    ),
    constraint itinerary_draft_slot_latitude_check check (
        latitude is null or latitude between -90 and 90
    ),
    constraint itinerary_draft_slot_longitude_check check (
        longitude is null or longitude between -180 and 180
    ),
    constraint itinerary_draft_slot_category_check check (
        category in (
            'MEAL',
            'CAFE',
            'CULTURE',
            'ACTIVITY',
            'SHOPPING',
            'TRANSIT',
            'OTHER'
        )
    ),
    constraint itinerary_draft_slot_expected_cost_check check (
        expected_cost between 0 and 100000000
    ),
    constraint itinerary_draft_slot_source_check check (source = 'MANUAL')
);

create index itinerary_draft_slot_order_idx
    on public.itinerary_draft_slot (trip_id, starts_at, id);

create table public.itinerary_version (
    id uuid primary key,
    trip_id uuid not null references public.trip (id) on delete cascade,
    version_number integer not null,
    reason varchar(30) not null,
    previous_version_id uuid references public.itinerary_version (id),
    draft_revision bigint not null,
    published_by_user_id uuid not null references public.app_user (id),
    publish_request_key_hash char(64) not null,
    published_at timestamptz not null default current_timestamp,
    constraint itinerary_version_number_check check (version_number > 0),
    constraint itinerary_version_reason_check check (reason = 'ORIGINAL'),
    constraint itinerary_version_draft_revision_check check (draft_revision >= 0),
    constraint itinerary_version_number_unique unique (trip_id, version_number),
    constraint itinerary_version_request_unique unique (
        trip_id,
        publish_request_key_hash
    )
);

create index itinerary_version_current_idx
    on public.itinerary_version (trip_id, version_number desc);

create table public.itinerary_slot (
    id uuid primary key,
    itinerary_version_id uuid not null references public.itinerary_version (id) on delete cascade,
    source_draft_slot_id uuid not null,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    place_name varchar(120) not null,
    address varchar(240) not null,
    latitude numeric(9, 6),
    longitude numeric(9, 6),
    indoor boolean not null,
    category varchar(30) not null,
    expected_cost integer not null,
    source varchar(20) not null,
    created_at timestamptz not null default current_timestamp,
    constraint itinerary_slot_time_check check (ends_at > starts_at),
    constraint itinerary_slot_coordinate_pair_check check (
        (latitude is null and longitude is null)
        or (latitude is not null and longitude is not null)
    ),
    constraint itinerary_slot_category_check check (
        category in (
            'MEAL',
            'CAFE',
            'CULTURE',
            'ACTIVITY',
            'SHOPPING',
            'TRANSIT',
            'OTHER'
        )
    ),
    constraint itinerary_slot_expected_cost_check check (
        expected_cost between 0 and 100000000
    ),
    constraint itinerary_slot_source_check check (source = 'MANUAL')
);

create index itinerary_slot_order_idx
    on public.itinerary_slot (itinerary_version_id, starts_at, id);

comment on table public.itinerary_draft is
    'Host-editable itinerary protected by an optimistic revision';

comment on table public.itinerary_draft_slot is
    'Mutable manually entered slots before publishing an immutable version';

comment on table public.itinerary_draft_slot_request is
    'Durable idempotency records retained after a draft slot is changed or deleted';

comment on table public.itinerary_version is
    'Immutable published itinerary version for a trip';

comment on table public.itinerary_slot is
    'Immutable slot snapshot belonging to one published itinerary version';
