create table public.notification (
    id uuid primary key,
    user_id uuid not null references public.app_user (id),
    trip_id uuid not null references public.trip (id) on delete cascade,
    type varchar(50) not null,
    proposal_set_id uuid not null references public.proposal_set (id) on delete cascade,
    itinerary_version_id uuid not null references public.itinerary_version (id) on delete cascade,
    created_at timestamptz not null default current_timestamp,
    read_at timestamptz,
    constraint notification_type_check check (
        type = 'ITINERARY_REPLAN_APPLIED'
    ),
    constraint notification_read_at_check check (
        read_at is null or read_at >= created_at
    ),
    constraint notification_replan_recipient_unique unique (
        proposal_set_id,
        user_id,
        type
    )
);

create index notification_user_created_idx
    on public.notification (user_id, created_at desc, id desc);

create index notification_user_unread_idx
    on public.notification (user_id, created_at desc, id desc)
    where read_at is null;

create index notification_trip_idx
    on public.notification (trip_id);

create index notification_itinerary_version_idx
    on public.notification (itinerary_version_id);

comment on table public.notification is
    'Private in-app notification generated atomically for each active trip member';

comment on column public.notification.read_at is
    'First synchronized read time; repeated read requests preserve this value';
