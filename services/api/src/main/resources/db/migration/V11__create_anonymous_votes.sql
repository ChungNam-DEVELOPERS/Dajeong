alter table public.proposal_set
    add column voting_opened_at timestamptz,
    add column voting_deadline_at timestamptz;

update public.proposal_set
set voting_opened_at = completed_at,
    voting_deadline_at = completed_at + interval '12 hours'
where status = 'OPEN';

alter table public.proposal_set
    add constraint proposal_set_voting_window_check check (
        (voting_opened_at is null and voting_deadline_at is null)
        or voting_deadline_at > voting_opened_at
    );

alter table public.proposal
    add constraint proposal_set_id_id_unique unique (proposal_set_id, id);

create table public.vote (
    proposal_set_id uuid not null references public.proposal_set (id) on delete cascade,
    user_id uuid not null references public.app_user (id),
    proposal_id uuid not null,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    primary key (proposal_set_id, user_id),
    constraint vote_proposal_in_set_fk foreign key (proposal_set_id, proposal_id)
        references public.proposal (proposal_set_id, id) on delete cascade
);

create index vote_proposal_count_idx
    on public.vote (proposal_set_id, proposal_id);

create index vote_user_idx
    on public.vote (user_id);

comment on table public.vote is
    'Private member selection; group responses expose only aggregate counts';

comment on column public.proposal_set.voting_deadline_at is
    'Write deadline; closing and applying the winning proposal are handled separately';
