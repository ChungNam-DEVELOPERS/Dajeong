create table public.app_user (
    id uuid primary key,
    cognito_subject varchar(255) not null unique,
    display_name varchar(100) not null,
    status varchar(20) not null default 'ACTIVE',
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    deleted_at timestamptz,
    constraint app_user_status_check check (status in ('ACTIVE', 'DELETED')),
    constraint app_user_deleted_at_check check (
        (status = 'ACTIVE' and deleted_at is null)
        or (status = 'DELETED' and deleted_at is not null)
    )
);

comment on table public.app_user is
    'Internal user identity linked one-to-one to an Amazon Cognito subject';

comment on column public.app_user.cognito_subject is
    'Stable sub claim from the configured Cognito User Pool';
