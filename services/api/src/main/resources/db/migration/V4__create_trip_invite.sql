create table public.trip_invite (
    id uuid primary key,
    trip_id uuid not null references public.trip (id) on delete cascade,
    code_hash char(64) not null unique,
    created_by_user_id uuid not null references public.app_user (id),
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default current_timestamp,
    constraint trip_invite_expiry_check check (expires_at > created_at),
    constraint trip_invite_revoked_at_check check (
        revoked_at is null or revoked_at >= created_at
    )
);

create unique index trip_invite_unrevoked_unique_idx
    on public.trip_invite (trip_id)
    where revoked_at is null;

create index trip_invite_trip_created_at_idx
    on public.trip_invite (trip_id, created_at desc);

comment on table public.trip_invite is
    'Seven-day trip join invitation; plaintext code is never persisted';

comment on column public.trip_invite.code_hash is
    'SHA-256 hash of the plaintext code returned only by the creation API';
