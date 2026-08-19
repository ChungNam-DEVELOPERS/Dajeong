alter table public.disruption
    drop constraint disruption_status_check;

alter table public.disruption
    add constraint disruption_status_check check (
        status in (
            'DETECTED',
            'ACKNOWLEDGED',
            'GENERATING',
            'VOTING',
            'FAILED',
            'DISMISSED'
        )
    );

create table public.concession_ledger (
    trip_id uuid not null references public.trip (id) on delete cascade,
    user_id uuid not null references public.app_user (id),
    score numeric(5, 2) not null default 0,
    updated_at timestamptz not null default current_timestamp,
    primary key (trip_id, user_id),
    constraint concession_ledger_score_check check (score between 0 and 100)
);

create table public.proposal_set (
    id uuid primary key,
    disruption_id uuid not null references public.disruption (id) on delete cascade,
    trip_id uuid not null references public.trip (id) on delete cascade,
    itinerary_version_id uuid not null references public.itinerary_version (id),
    requested_by_user_id uuid not null references public.app_user (id),
    request_key_hash char(64) not null,
    input_snapshot_hash char(64),
    status varchar(20) not null default 'QUEUED',
    candidate_limit smallint not null default 3,
    shortage_reason varchar(240),
    failure_code varchar(50),
    created_at timestamptz not null default current_timestamp,
    started_at timestamptz,
    completed_at timestamptz,
    updated_at timestamptz not null default current_timestamp,
    constraint proposal_set_status_check check (
        status in ('QUEUED', 'GENERATING', 'OPEN', 'FAILED', 'CANCELLED')
    ),
    constraint proposal_set_candidate_limit_check check (
        candidate_limit between 1 and 3
    ),
    constraint proposal_set_request_unique unique (
        requested_by_user_id,
        request_key_hash
    )
);

create index proposal_set_disruption_created_idx
    on public.proposal_set (disruption_id, created_at desc, id desc);

create table public.proposal (
    id uuid primary key,
    proposal_set_id uuid not null references public.proposal_set (id) on delete cascade,
    source_candidate_id varchar(120) not null,
    rank smallint not null,
    title varchar(140) not null,
    summary varchar(500) not null,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    place_name varchar(120) not null,
    address varchar(240) not null,
    latitude numeric(9, 6) not null,
    longitude numeric(9, 6) not null,
    indoor boolean not null,
    category varchar(30) not null,
    expected_cost integer not null,
    total_travel_minutes integer not null,
    minimum_member_satisfaction numeric(5, 2) not null,
    weighted_average_satisfaction numeric(5, 2) not null,
    created_at timestamptz not null default current_timestamp,
    constraint proposal_rank_check check (rank between 1 and 3),
    constraint proposal_time_check check (ends_at > starts_at),
    constraint proposal_category_check check (
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
    constraint proposal_expected_cost_check check (
        expected_cost between 0 and 100000000
    ),
    constraint proposal_travel_minutes_check check (
        total_travel_minutes between 0 and 1440
    ),
    constraint proposal_minimum_satisfaction_check check (
        minimum_member_satisfaction between 0 and 100
    ),
    constraint proposal_average_satisfaction_check check (
        weighted_average_satisfaction between 0 and 100
    ),
    constraint proposal_rank_unique unique (proposal_set_id, rank),
    constraint proposal_source_unique unique (
        proposal_set_id,
        source_candidate_id
    )
);

create table public.proposal_member_score (
    proposal_id uuid not null references public.proposal (id) on delete cascade,
    user_id uuid not null references public.app_user (id),
    category_match numeric(5, 2) not null,
    budget_fit numeric(5, 2) not null,
    travel_fit numeric(5, 2) not null,
    activity_fit numeric(5, 2) not null,
    utility numeric(5, 2) not null,
    concession_weight numeric(4, 2) not null,
    primary key (proposal_id, user_id),
    constraint proposal_member_category_check check (category_match between 0 and 100),
    constraint proposal_member_budget_check check (budget_fit between 0 and 100),
    constraint proposal_member_travel_check check (travel_fit between 0 and 100),
    constraint proposal_member_activity_check check (activity_fit between 0 and 100),
    constraint proposal_member_utility_check check (utility between 0 and 100),
    constraint proposal_member_weight_check check (concession_weight between 1 and 2)
);

comment on table public.proposal_set is
    'Idempotent replan generation job bound to an immutable itinerary version';

comment on table public.proposal is
    'Verified group-visible replacement candidate ranked by deterministic fairness rules';

comment on table public.proposal_member_score is
    'Private member utility components that must never appear in group API responses';

comment on table public.concession_ledger is
    'Private per-member fairness weight carried across applied replans';
