create table public.deleted_identity (
    subject_hash char(64) primary key,
    deleted_at timestamptz not null default current_timestamp
);

comment on table public.deleted_identity is
    'Non-reversible Cognito subject tombstone that blocks deleted account tokens';

comment on column public.deleted_identity.subject_hash is
    'SHA-256 hash only; the original Cognito subject is not retained after deletion';
