create table public.system_health (
    id smallint primary key,
    initialized_at timestamptz not null default current_timestamp,
    constraint system_health_singleton check (id = 1)
);

comment on table public.system_health is
    'Flyway schema initialization marker used by the system health probe';

insert into public.system_health (id) values (1);
