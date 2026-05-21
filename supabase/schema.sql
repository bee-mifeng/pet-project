create extension if not exists pgcrypto;

create table if not exists public.memorials (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  pet_name text not null,
  pet_type text not null,
  birth_or_adopted_date date null,
  passed_date date null,
  story text null,
  message text null,
  photo_url text null,
  is_public boolean default false,
  allow_messages boolean default true,
  review_status text default 'private',
  flowers_count integer default 0,
  paw_lights_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint memorials_pet_type_check check (pet_type in ('cat', 'dog', 'other')),
  constraint memorials_review_status_check check (
    review_status in ('private', 'pending', 'approved', 'rejected')
  ),
  constraint memorials_flowers_count_check check (flowers_count >= 0),
  constraint memorials_paw_lights_count_check check (paw_lights_count >= 0)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid references public.memorials(id) on delete cascade,
  visitor_name text null,
  content text not null,
  review_status text default 'pending',
  created_at timestamp with time zone default now(),
  constraint messages_review_status_check check (
    review_status in ('pending', 'approved', 'rejected')
  )
);

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid references public.memorials(id) on delete cascade,
  type text not null,
  visitor_key text null,
  created_at timestamp with time zone default now(),
  constraint interactions_type_check check (type in ('flower', 'paw_light'))
);

create index if not exists memorials_public_review_idx
  on public.memorials (review_status, is_public, pet_type, created_at desc);

create index if not exists memorials_slug_idx on public.memorials (slug);
create index if not exists messages_memorial_review_idx
  on public.messages (memorial_id, review_status, created_at desc);
create index if not exists interactions_memorial_type_idx
  on public.interactions (memorial_id, type, created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists memorials_set_updated_at on public.memorials;
create trigger memorials_set_updated_at
before update on public.memorials
for each row execute function public.set_updated_at();

alter table public.memorials enable row level security;
alter table public.messages enable row level security;
alter table public.interactions enable row level security;

drop policy if exists "Public can read memorials" on public.memorials;
create policy "Public can read memorials"
on public.memorials for select
to anon
using (true);

drop policy if exists "Public can create memorials" on public.memorials;
create policy "Public can create memorials"
on public.memorials for insert
to anon
with check (true);

drop policy if exists "Public can update memorial MVP fields" on public.memorials;
create policy "Public can update memorial MVP fields"
on public.memorials for update
to anon
using (true)
with check (true);

drop policy if exists "Public can read messages" on public.messages;
create policy "Public can read messages"
on public.messages for select
to anon
using (true);

drop policy if exists "Public can create messages" on public.messages;
create policy "Public can create messages"
on public.messages for insert
to anon
with check (true);

drop policy if exists "Public can review messages MVP" on public.messages;
create policy "Public can review messages MVP"
on public.messages for update
to anon
using (true)
with check (true);

drop policy if exists "Public can read interactions" on public.interactions;
create policy "Public can read interactions"
on public.interactions for select
to anon
using (true);

drop policy if exists "Public can create interactions" on public.interactions;
create policy "Public can create interactions"
on public.interactions for insert
to anon
with check (true);
