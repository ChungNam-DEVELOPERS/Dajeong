create table public.trip (
    id uuid primary key,
    title varchar(100) not null,
    region varchar(20) not null default 'DAEJEON',
    start_date date not null,
    end_date date not null,
    host_user_id uuid not null references public.app_user (id),
    status varchar(20) not null default 'DRAFT',
    creation_request_key_hash char(64) not null,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    constraint trip_title_check check (
        char_length(btrim(title)) between 1 and 100
    ),
    constraint trip_region_check check (region = 'DAEJEON'),
    constraint trip_date_range_check check (end_date >= start_date),
    constraint trip_status_check check (
        status in ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED')
    ),
    constraint trip_creation_request_unique unique (
        host_user_id,
        creation_request_key_hash
    )
);

create index trip_host_created_at_idx
    on public.trip (host_user_id, created_at desc, id desc);

create table public.trip_membership (
    id uuid primary key,
    trip_id uuid not null references public.trip (id) on delete cascade,
    user_id uuid not null references public.app_user (id),
    role varchar(20) not null,
    status varchar(20) not null default 'ACTIVE',
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    ended_at timestamptz,
    constraint trip_membership_role_check check (role in ('HOST', 'MEMBER')),
    constraint trip_membership_status_check check (
        status in ('ACTIVE', 'LEFT', 'REMOVED')
    ),
    constraint trip_membership_ended_at_check check (
        (status = 'ACTIVE' and ended_at is null)
        or (status in ('LEFT', 'REMOVED') and ended_at is not null)
    ),
    constraint trip_membership_user_unique unique (trip_id, user_id)
);

create unique index trip_active_host_unique_idx
    on public.trip_membership (trip_id)
    where role = 'HOST' and status = 'ACTIVE';

create index trip_membership_user_created_at_idx
    on public.trip_membership (user_id, created_at desc, trip_id);

comment on table public.trip is
    'A Daejeon group trip owned by one internal user';

comment on table public.trip_membership is
    'Trip authorization membership resolved on every protected request';

comment on column public.trip.creation_request_key_hash is
    'SHA-256 hash of the per-user Idempotency-Key used to create the trip';
