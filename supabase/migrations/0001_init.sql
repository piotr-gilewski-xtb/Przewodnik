-- Profiles mirror auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  destination text not null,
  start_date date not null,
  end_date date not null,
  preferences jsonb not null default '{}'::jsonb,
  notes text,
  status text not null default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.trip_collaborators (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text,
  role text not null default 'editor',
  created_at timestamptz default now(),
  primary key (trip_id, coalesce(user_id::text, invited_email))
);

create table if not exists public.plan_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_date date not null,
  position int not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.attractions (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.plan_days(id) on delete cascade,
  name text not null,
  description text,
  start_time time,
  end_time time,
  address text,
  lat double precision,
  lng double precision,
  google_place_id text,
  google_maps_url text,
  photo_url text,
  photo_source text default 'google',
  position int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  kind text not null,
  prompt jsonb,
  response jsonb,
  created_at timestamptz default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

-- Helper: trip access
create or replace function public.can_access_trip(t_id uuid, u_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.trips t
    where t.id = t_id and t.owner_id = u_id
  ) or exists (
    select 1 from public.trip_collaborators c
    where c.trip_id = t_id and c.user_id = u_id
  );
$$;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_collaborators enable row level security;
alter table public.plan_days enable row level security;
alter table public.attractions enable row level security;
alter table public.ai_generations enable row level security;
alter table public.chat_messages enable row level security;

create policy "profiles self" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

create policy "trips owner select" on public.trips for select using (public.can_access_trip(id, auth.uid()));
create policy "trips owner modify" on public.trips for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "collab select" on public.trip_collaborators for select using (public.can_access_trip(trip_id, auth.uid()));
create policy "collab owner modify" on public.trip_collaborators for all using (
  exists(select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
) with check (
  exists(select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
);

create policy "plan_days access" on public.plan_days for all
  using (public.can_access_trip(trip_id, auth.uid()))
  with check (public.can_access_trip(trip_id, auth.uid()));

create policy "attractions access" on public.attractions for all
  using (public.can_access_trip((select trip_id from public.plan_days d where d.id = plan_day_id), auth.uid()))
  with check (public.can_access_trip((select trip_id from public.plan_days d where d.id = plan_day_id), auth.uid()));

create policy "ai_generations access" on public.ai_generations for all
  using (trip_id is null or public.can_access_trip(trip_id, auth.uid()))
  with check (trip_id is null or public.can_access_trip(trip_id, auth.uid()));

create policy "chat access" on public.chat_messages for all
  using (public.can_access_trip(trip_id, auth.uid()))
  with check (public.can_access_trip(trip_id, auth.uid()));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
