alter table public.proposal_set
    drop constraint proposal_set_status_check;

alter table public.proposal_set
    add constraint proposal_set_status_check check (
        status in (
            'QUEUED',
            'GENERATING',
            'OPEN',
            'CLOSED',
            'APPLIED',
            'FAILED',
            'CANCELLED'
        )
    );

alter table public.disruption
    drop constraint disruption_status_check;

alter table public.disruption
    add constraint disruption_status_check check (
        status in (
            'DETECTED',
            'ACKNOWLEDGED',
            'GENERATING',
            'VOTING',
            'APPLIED',
            'FAILED',
            'DISMISSED'
        )
    );

alter table public.itinerary_version
    drop constraint itinerary_version_reason_check;

alter table public.itinerary_version
    add constraint itinerary_version_reason_check check (
        reason in ('ORIGINAL', 'REPLAN')
    );

alter table public.itinerary_slot
    drop constraint itinerary_slot_source_check;

alter table public.itinerary_slot
    add constraint itinerary_slot_source_check check (
        source in ('MANUAL', 'REPLAN')
    );

alter table public.proposal_set
    add column winner_proposal_id uuid,
    add column applied_itinerary_version_id uuid
        references public.itinerary_version (id),
    add column closing_reason varchar(30),
    add column closed_at timestamptz,
    add column applied_at timestamptz,
    add constraint proposal_set_winner_in_set_fk
        foreign key (id, winner_proposal_id)
        references public.proposal (proposal_set_id, id),
    add constraint proposal_set_applied_version_unique
        unique (applied_itinerary_version_id),
    add constraint proposal_set_closing_reason_check check (
        closing_reason in ('ALL_MEMBERS_VOTED', 'DEADLINE')
    ),
    add constraint proposal_set_applied_result_check check (
        status <> 'APPLIED'
        or (
            winner_proposal_id is not null
            and applied_itinerary_version_id is not null
            and closing_reason is not null
            and closed_at is not null
            and applied_at is not null
        )
    );

create index proposal_set_due_vote_idx
    on public.proposal_set (voting_deadline_at, id)
    where status = 'OPEN';

comment on column public.proposal_set.winner_proposal_id is
    'Deterministic winning proposal; null when a vote closes without any valid vote';

comment on column public.proposal_set.applied_itinerary_version_id is
    'Immutable REPLAN itinerary version created by this proposal set';

comment on column public.proposal_set.closing_reason is
    'Whether all eligible members voted or the 12-hour deadline elapsed';
