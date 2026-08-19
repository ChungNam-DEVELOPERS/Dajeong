alter table public.disruption
    drop constraint disruption_type_check;

alter table public.disruption
    alter column reported_by_user_id drop not null,
    add column weather_grid_x integer,
    add column weather_grid_y integer,
    add column precipitation_probability smallint,
    add column forecast_at timestamptz,
    add column forecast_issued_at timestamptz,
    add constraint disruption_type_check check (
        type in ('WEATHER', 'CLOSURE', 'TRAFFIC', 'OTHER')
    ),
    add constraint disruption_weather_evidence_check check (
        (
            type = 'WEATHER'
            and reported_by_user_id is null
            and weather_grid_x is not null
            and weather_grid_y is not null
            and precipitation_probability between 0 and 100
            and forecast_at is not null
            and forecast_issued_at is not null
        )
        or (
            type <> 'WEATHER'
            and reported_by_user_id is not null
            and weather_grid_x is null
            and weather_grid_y is null
            and precipitation_probability is null
            and forecast_at is null
            and forecast_issued_at is null
        )
    );

create unique index disruption_weather_forecast_unique_idx
    on public.disruption (itinerary_slot_id, forecast_issued_at)
    where type = 'WEATHER';

create table public.weather_forecast_cache (
    latitude numeric(9, 6) not null,
    longitude numeric(9, 6) not null,
    grid_x integer not null,
    grid_y integer not null,
    forecast_at timestamptz not null,
    issued_at timestamptz not null,
    precipitation_probability smallint not null,
    fetched_at timestamptz not null default current_timestamp,
    primary key (latitude, longitude, forecast_at, issued_at),
    constraint weather_forecast_cache_probability_check check (
        precipitation_probability between 0 and 100
    )
);

create index weather_forecast_cache_grid_time_idx
    on public.weather_forecast_cache (grid_x, grid_y, forecast_at, issued_at desc);

comment on table public.weather_forecast_cache is
    'Short-term precipitation forecasts cached by itinerary coordinates and KMA grid';

comment on index public.disruption_weather_forecast_unique_idx is
    'Prevents duplicate weather disruptions for the same slot and forecast issue time';
