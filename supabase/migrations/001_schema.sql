-- =============================================================================
-- House of Hannah — complete database schema (single, idempotent migration)
--
-- Run once in the Supabase SQL editor of a NEW project (or via `supabase db push`).
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE / ON CONFLICT.
--
-- Security model
--   * Anonymous visitors can only: read active services/gallery/published
--     reviews/settings, submit a request (RPC), track a request (RPC, needs
--     request number + phone), send feedback, and post a review.
--   * Staff roles: admin (everything) · manager (all requests, assign) ·
--     worker (only requests assigned to them, status changes only).
--   * Every table has row-level security enabled. Sensitive columns are
--     protected by triggers, not just by the UI.
--   * Public RPCs are rate limited per IP and per request number.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
create or replace function public.normalize_kenyan_phone(raw text)
returns text language sql immutable set search_path = '' as $$
  select case
    when d is null or d = '' then null
    when d like '254%' then d
    when d like '0%' then '254' || substr(d, 2)
    when length(d) = 9 then '254' || d
    else d
  end
  from (select regexp_replace(coalesce(raw, ''), '\D', '', 'g') as d) t;
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ----------------------------------------------------------------------------
-- Staff profiles (one row per auth user who works at the business)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null check (char_length(full_name) between 1 and 100),
  phone         text check (char_length(phone) <= 30),
  role          text not null default 'worker' check (role in ('admin','manager','worker')),
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);

-- Role lookups used by every policy. SECURITY DEFINER so policies on
-- `profiles` itself can call them without recursing. A paused staff member
-- (is_active = false) resolves to NULL and so loses all access instantly.
create or replace function public.current_staff_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$ select public.current_staff_role() = 'admin' $$;
create or replace function public.is_admin_or_manager() returns boolean
language sql stable security definer set search_path = '' as $$ select public.current_staff_role() in ('admin','manager') $$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$ select public.current_staff_role() is not null $$;

-- Non-admins may never change role / active flag / identity on any profile.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.id <> old.id or new.role <> old.role or new.is_active <> old.is_active or new.full_name <> old.full_name then
      raise exception 'not_allowed';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ----------------------------------------------------------------------------
-- Services & price list
-- ----------------------------------------------------------------------------
create table if not exists public.services (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name         text not null check (char_length(name) between 1 and 100),
  description  text check (char_length(description) <= 600),
  image_url    text check (image_url is null or image_url ~* '^https?://'),
  price_type   text not null default 'on_request' check (price_type in ('fixed','on_request')),
  price_amount numeric(10,2) check (price_amount is null or price_amount >= 0),
  price_unit   text check (char_length(price_unit) <= 30),
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Service requests
-- ----------------------------------------------------------------------------
create table if not exists public.service_requests (
  id                          uuid primary key default gen_random_uuid(),
  public_request_number       text not null unique,
  customer_name               text not null check (char_length(customer_name) between 2 and 100),
  phone_display               text not null check (char_length(phone_display) <= 30),
  phone_normalized            text not null,
  email                       text check (char_length(email) <= 150),
  service_id                  uuid references public.services(id) on delete restrict,
  custom_service              text check (char_length(custom_service) <= 200),
  quantity_approx             text check (char_length(quantity_approx) <= 100),
  weight_approx               text check (char_length(weight_approx) <= 100),
  special_care                text check (char_length(special_care) <= 1500),
  stain_notes                 text check (char_length(stain_notes) <= 500),
  general_notes               text check (char_length(general_notes) <= 1500),
  material                    text check (char_length(material) <= 60),
  custom_material             text check (char_length(custom_material) <= 100),
  fulfillment_type            text not null default 'dropoff' check (fulfillment_type in ('dropoff','pickup')),
  pickup_area                 text check (char_length(pickup_area) <= 150),
  pickup_location             text check (char_length(pickup_location) <= 300),
  pickup_directions           text check (char_length(pickup_directions) <= 500),
  pickup_county               text check (char_length(pickup_county) <= 60),
  pickup_constituency         text check (char_length(pickup_constituency) <= 100),
  pickup_ward                 text check (char_length(pickup_ward) <= 100),
  pickup_date                 date,
  pickup_time                 text check (char_length(pickup_time) <= 40),
  pickup_now                  boolean not null default false,
  preferred_pickup_datetime   timestamptz,
  pickup_lat                  double precision check (pickup_lat between -90 and 90),
  pickup_lng                  double precision check (pickup_lng between -180 and 180),
  pickup_accuracy_m           double precision check (pickup_accuracy_m >= 0),
  collector_name              text check (char_length(collector_name) <= 100),
  collector_phone             text check (char_length(collector_phone) <= 30),
  collector_relationship      text check (char_length(collector_relationship) <= 60),
  collector_note              text check (char_length(collector_note) <= 300),
  return_method               text check (return_method in ('self_collect','delivery','send_someone')),
  return_collector_name       text check (char_length(return_collector_name) <= 100),
  return_collector_phone      text check (char_length(return_collector_phone) <= 30),
  return_set_at               timestamptz,
  status                      text not null default 'submitted'
                              check (status in ('submitted','confirmed','picked_up','processing','ready','completed','cancelled')),
  payment_status              text not null default 'unpaid' check (payment_status in ('unpaid','paid')),
  amount                      numeric(10,2) check (amount is null or amount >= 0),
  assigned_worker_id          uuid references public.profiles(id) on delete set null,
  internal_notes              text check (char_length(internal_notes) <= 2000),
  collected_at                timestamptz,
  delivered_at                timestamptz,
  client_submission_id        uuid unique,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  completed_at                timestamptz
);
create index if not exists idx_requests_phone     on public.service_requests (phone_normalized);
create index if not exists idx_requests_status    on public.service_requests (status, created_at desc);
create index if not exists idx_requests_worker    on public.service_requests (assigned_worker_id) where assigned_worker_id is not null;
create index if not exists idx_requests_created   on public.service_requests (created_at desc);

create table if not exists public.request_items (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.service_requests(id) on delete cascade,
  item_name   text not null check (char_length(item_name) between 1 and 100),
  quantity    text check (char_length(quantity) <= 50),
  is_custom   boolean not null default false
);
create index if not exists idx_items_request on public.request_items (request_id);

create table if not exists public.request_status_history (
  id          bigint generated always as identity primary key,
  request_id  uuid not null references public.service_requests(id) on delete cascade,
  status      text not null,
  changed_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_history_request on public.request_status_history (request_id, created_at);

-- ----------------------------------------------------------------------------
-- Rate limiting (per IP / per key) — used by the public RPCs and form triggers
-- ----------------------------------------------------------------------------
create table if not exists public.rate_limit_events (
  id         bigint generated always as identity primary key,
  bucket     text not null,
  key        text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_rl_lookup on public.rate_limit_events (bucket, key, created_at desc);
alter table public.rate_limit_events enable row level security;  -- no policies: invisible to API roles

create or replace function public.client_ip() returns text
language plpgsql stable set search_path = '' as $$
declare h json;
begin
  begin h := current_setting('request.headers', true)::json; exception when others then h := null; end;
  return coalesce(split_part(h->>'x-forwarded-for', ',', 1), h->>'cf-connecting-ip', h->>'x-real-ip', 'unknown');
end $$;

-- Records one hit and raises 'rate_limited' if the key has exceeded `max_hits`
-- inside `win`. SECURITY DEFINER so anonymous callers can be limited without
-- ever being able to read or write the events table themselves.
create or replace function public.rate_limit(p_bucket text, p_key text, p_max int, p_window interval)
returns void language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  select count(*) into n from public.rate_limit_events e
   where e.bucket = p_bucket and e.key = p_key and e.created_at > now() - p_window;
  if n >= p_max then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  insert into public.rate_limit_events (bucket, key) values (p_bucket, p_key);
  if random() < 0.02 then delete from public.rate_limit_events where created_at < now() - interval '2 days'; end if;
end $$;
revoke all on function public.rate_limit(text, text, int, interval) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Request numbers, phone normalisation, status history, notifications
-- ----------------------------------------------------------------------------
create or replace function public.generate_request_number() returns text
language plpgsql volatile set search_path = '' as $$
declare candidate text; tries int := 0;
begin
  loop
    -- Random (not sequential) suffix: request numbers don't reveal order volume and can't be walked.
    candidate := 'HOH-' || to_char(now() at time zone 'Africa/Nairobi', 'YYYY') || '-' ||
      lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint % 900000) + 100000)::text, 6, '0');
    exit when not exists (select 1 from public.service_requests where public_request_number = candidate);
    tries := tries + 1;
    if tries > 20 then raise exception 'could not allocate request number'; end if;
  end loop;
  return candidate;
end $$;

create or replace function public.requests_before_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.phone_normalized := public.normalize_kenyan_phone(new.phone_display);
  if new.public_request_number is null or new.public_request_number = '' then
    new.public_request_number := public.generate_request_number();
  end if;
  return new;
end $$;
drop trigger if exists trg_requests_before_insert on public.service_requests;
create trigger trg_requests_before_insert before insert on public.service_requests
  for each row execute function public.requests_before_insert();

-- Column-level guard for UPDATEs coming through the API.
--   worker  : may only advance `status` one step on a request assigned to them
--   manager : may only change `status` and `assigned_worker_id`
--   admin   : everything except identity / customer-submitted facts
create or replace function public.requests_guard_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r text := public.current_staff_role();
begin
  if auth.uid() is null then return new; end if;       -- service role / SQL editor
  if new.id <> old.id or new.public_request_number <> old.public_request_number
     or new.phone_normalized <> old.phone_normalized or new.created_at <> old.created_at then
    raise exception 'immutable_field';
  end if;
  if r = 'worker' then
    if (to_jsonb(new) - 'status' - 'updated_at' - 'completed_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at' - 'completed_at') then
      raise exception 'workers_may_only_change_status';
    end if;
    if not ((old.status = 'confirmed'  and new.status in ('confirmed','picked_up'))
         or (old.status = 'picked_up'  and new.status in ('picked_up','processing'))
         or (old.status = 'processing' and new.status in ('processing','ready'))
         or (old.status = 'ready'      and new.status in ('ready','completed'))
         or new.status = old.status) then
      raise exception 'invalid_status_transition';
    end if;
  elsif r = 'manager' then
    if (to_jsonb(new) - 'status' - 'assigned_worker_id' - 'updated_at' - 'completed_at')
       is distinct from (to_jsonb(old) - 'status' - 'assigned_worker_id' - 'updated_at' - 'completed_at') then
      raise exception 'managers_may_only_change_status_and_assignment';
    end if;
  end if;
  new.updated_at := now();
  if new.status = 'completed' and old.status <> 'completed' then new.completed_at := now(); end if;
  return new;
end $$;
drop trigger if exists trg_requests_guard_update on public.service_requests;
create trigger trg_requests_guard_update before update on public.service_requests
  for each row execute function public.requests_guard_update();

-- Status timeline (shown to customers on the tracking page).
create or replace function public.requests_after_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.request_status_history (request_id, status, changed_by) values (new.id, new.status, auth.uid());
  end if;
  if tg_op = 'INSERT' and new.fulfillment_type = 'pickup' then
    insert into public.notifications (recipient_id, type, title, related_request_id)
    values (null, case when new.pickup_now then 'pickup_now' else 'pickup_request' end,
            case when new.pickup_now then 'URGENT pickup request — ' else 'New pickup request — ' end || new.public_request_number,
            new.id);
  end if;
  return null;
end $$;

-- ----------------------------------------------------------------------------
-- Notifications, activity log
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id                 uuid primary key default gen_random_uuid(),
  recipient_id       uuid references public.profiles(id) on delete cascade,  -- NULL = shared admin inbox
  type               text not null check (char_length(type) <= 40),
  title              text not null check (char_length(title) <= 200),
  related_request_id uuid references public.service_requests(id) on delete cascade,
  is_read            boolean not null default false,
  created_at         timestamptz not null default now()
);
create index if not exists idx_notif_recipient on public.notifications (recipient_id, is_read);

drop trigger if exists trg_requests_after_write on public.service_requests;
create trigger trg_requests_after_write after insert or update on public.service_requests
  for each row execute function public.requests_after_write();

create table if not exists public.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles(id) on delete set null,
  actor_label  text check (char_length(actor_label) <= 100),
  action       text not null check (char_length(action) <= 60),
  target_table text check (char_length(target_table) <= 60),
  target_id    uuid,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_activity_created on public.activity_logs (created_at desc);

-- ----------------------------------------------------------------------------
-- Public content: gallery, reviews, feedback, settings, legal pages
-- ----------------------------------------------------------------------------
create table if not exists public.gallery (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null check (char_length(storage_path) <= 300),
  category     text not null default 'Laundry' check (char_length(category) <= 60),
  caption      text check (char_length(caption) <= 200),
  is_featured  boolean not null default false,
  is_published boolean not null default true,
  sort_order   int not null default 0,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  phone         text check (char_length(phone) <= 30),
  email         text check (char_length(email) <= 150),
  rating        int not null check (rating between 1 and 5),
  review_text   text not null check (char_length(review_text) between 1 and 1000),
  status        text not null default 'published' check (status in ('published','hidden','removed')),
  moderated_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.feedback_messages (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null check (char_length(name) between 1 and 100),
  phone                  text check (char_length(phone) <= 30),
  email                  text check (char_length(email) <= 150),
  message_type           text not null default 'feedback' check (message_type in ('feedback','complaint')),
  related_request_number text check (char_length(related_request_number) <= 30),
  message                text not null check (char_length(message) between 1 and 2000),
  status                 text not null default 'new' check (status in ('new','read','resolved')),
  created_at             timestamptz not null default now()
);

-- Per-IP throttles on the two anonymous write forms.
create or replace function public.throttle_public_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.rate_limit(tg_table_name || '_insert', public.client_ip(), 8, interval '1 hour');
  return new;
end $$;
drop trigger if exists trg_throttle_reviews on public.reviews;
create trigger trg_throttle_reviews before insert on public.reviews for each row execute function public.throttle_public_insert();
drop trigger if exists trg_throttle_feedback on public.feedback_messages;
create trigger trg_throttle_feedback before insert on public.feedback_messages for each row execute function public.throttle_public_insert();

create table if not exists public.business_settings (
  id              int primary key check (id = 1),
  business_name   text check (char_length(business_name) <= 100),
  tagline         text check (char_length(tagline) <= 150),
  phone           text check (char_length(phone) <= 30),
  whatsapp_number text check (whatsapp_number ~ '^[0-9]{9,15}$'),
  address         text check (char_length(address) <= 300),
  maps_url        text check (maps_url is null or maps_url ~* '^https?://'),
  email           text check (char_length(email) <= 150),
  business_hours  jsonb,
  updated_at      timestamptz not null default now()
);
create table if not exists public.social_links (
  platform  text primary key check (char_length(platform) <= 30),
  url       text not null check (url ~* '^https?://' and char_length(url) <= 300),
  is_active boolean not null default true
);
create table if not exists public.legal_pages (
  slug         text primary key check (slug in ('privacy','terms')),
  title        text not null,
  content      text not null default '',
  published_at timestamptz,
  updated_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------
alter table public.profiles               enable row level security;
alter table public.services               enable row level security;
alter table public.service_requests       enable row level security;
alter table public.request_items          enable row level security;
alter table public.request_status_history enable row level security;
alter table public.notifications          enable row level security;
alter table public.activity_logs          enable row level security;
alter table public.gallery                enable row level security;
alter table public.reviews                enable row level security;
alter table public.feedback_messages      enable row level security;
alter table public.business_settings      enable row level security;
alter table public.social_links           enable row level security;
alter table public.legal_pages            enable row level security;

-- Drop-and-recreate keeps this file re-runnable.
do $$ declare p record; begin
  for p in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin_or_manager());
create policy profiles_update_self_or_admin on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- services
create policy services_public_read on public.services for select to anon, authenticated using (is_active or public.is_staff());
create policy services_admin_insert on public.services for insert to authenticated with check (public.is_admin());
create policy services_admin_update on public.services for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy services_admin_delete on public.services for delete to authenticated using (public.is_admin());

-- service_requests (customers never touch this table directly — only RPCs)
create policy requests_staff_read on public.service_requests for select to authenticated
  using (public.is_admin_or_manager() or (public.current_staff_role() = 'worker' and assigned_worker_id = auth.uid()));
create policy requests_staff_update on public.service_requests for update to authenticated
  using (public.is_admin_or_manager() or (public.current_staff_role() = 'worker' and assigned_worker_id = auth.uid()))
  with check (public.is_admin_or_manager() or (public.current_staff_role() = 'worker' and assigned_worker_id = auth.uid()));

-- items + timeline follow the request's visibility
create policy items_staff_read on public.request_items for select to authenticated
  using (exists (select 1 from public.service_requests r where r.id = request_id));
create policy history_staff_read on public.request_status_history for select to authenticated
  using (exists (select 1 from public.service_requests r where r.id = request_id));

-- notifications
create policy notif_read on public.notifications for select to authenticated
  using (recipient_id = auth.uid() or (recipient_id is null and public.is_admin_or_manager()));
create policy notif_insert on public.notifications for insert to authenticated with check (public.is_admin_or_manager());
create policy notif_update on public.notifications for update to authenticated
  using (recipient_id = auth.uid() or (recipient_id is null and public.is_admin_or_manager()))
  with check (recipient_id = auth.uid() or (recipient_id is null and public.is_admin_or_manager()));

-- activity log: staff append their own entries; only admins read
create policy activity_insert on public.activity_logs for insert to authenticated
  with check (public.is_staff() and actor_id = auth.uid());
create policy activity_admin_read on public.activity_logs for select to authenticated using (public.is_admin());

-- gallery
create policy gallery_public_read on public.gallery for select to anon, authenticated using (is_published or public.is_admin_or_manager());
create policy gallery_staff_insert on public.gallery for insert to authenticated with check (public.is_admin_or_manager());
create policy gallery_staff_update on public.gallery for update to authenticated using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
create policy gallery_staff_delete on public.gallery for delete to authenticated using (public.is_admin_or_manager());

-- reviews: public may read published ones (contact columns are NOT exposed, see grants) and submit new ones
create policy reviews_public_read on public.reviews for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy reviews_public_insert on public.reviews for insert to anon, authenticated
  with check (status = 'published' and moderated_at is null);
create policy reviews_admin_update on public.reviews for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- feedback: anyone may send; only admins read/manage
create policy feedback_public_insert on public.feedback_messages for insert to anon, authenticated with check (status = 'new');
create policy feedback_admin_read on public.feedback_messages for select to authenticated using (public.is_admin());
create policy feedback_admin_update on public.feedback_messages for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- settings / socials / legal
create policy settings_public_read on public.business_settings for select to anon, authenticated using (true);
create policy settings_admin_write on public.business_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy social_public_read on public.social_links for select to anon, authenticated using (is_active or public.is_admin());
create policy social_admin_insert on public.social_links for insert to authenticated with check (public.is_admin());
create policy social_admin_update on public.social_links for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy social_admin_delete on public.social_links for delete to authenticated using (public.is_admin());
create policy legal_public_read on public.legal_pages for select to anon, authenticated using (published_at is not null or public.is_admin());
create policy legal_admin_write on public.legal_pages for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Table privileges: least privilege on top of RLS
-- ----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

grant select on public.services, public.gallery, public.business_settings, public.social_links, public.legal_pages to anon;
-- Reviews: anonymous visitors can read only the public columns — never phone/email.
grant select (id, customer_name, rating, review_text, status, created_at) on public.reviews to anon;
grant insert (customer_name, phone, email, rating, review_text) on public.reviews to anon, authenticated;
grant insert (name, phone, email, message_type, related_request_number, message) on public.feedback_messages to anon, authenticated;

grant select on public.services, public.gallery, public.business_settings, public.social_links, public.legal_pages,
               public.reviews, public.feedback_messages, public.profiles, public.service_requests, public.request_items,
               public.request_status_history, public.notifications, public.activity_logs to authenticated;
grant insert, update, delete on public.services, public.gallery to authenticated;
grant update on public.business_settings, public.legal_pages, public.feedback_messages, public.service_requests, public.notifications to authenticated;
grant update (status, moderated_at) on public.reviews to authenticated;
grant update (last_login_at, phone, full_name, role, is_active) on public.profiles to authenticated;
grant insert, update, delete on public.social_links to authenticated;
grant insert on public.notifications, public.activity_logs to authenticated;
-- Defence in depth: staff never delete requests through the API.

-- ----------------------------------------------------------------------------
-- Public RPCs
-- ----------------------------------------------------------------------------
create or replace function public.submit_service_request(
  p_customer_name text, p_phone_display text, p_email text, p_service_id uuid, p_custom_service text,
  p_quantity_approx text, p_weight_approx text, p_special_care text, p_stain_notes text, p_general_notes text,
  p_fulfillment_type text, p_pickup_area text, p_pickup_location text, p_pickup_directions text,
  p_pickup_date date, p_pickup_time text, p_pickup_now boolean, p_preferred_pickup_datetime timestamptz,
  p_pickup_lat double precision, p_pickup_lng double precision, p_pickup_accuracy_m double precision,
  p_pickup_county text, p_pickup_constituency text, p_pickup_ward text,
  p_material text, p_custom_material text,
  p_collector_name text, p_collector_phone text, p_collector_relationship text, p_collector_note text,
  p_items jsonb, p_client_submission_id uuid
) returns table (id uuid, public_request_number text)
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid; v_number text; v_item jsonb;
begin
  perform public.rate_limit('submit_request', public.client_ip(), 20, interval '1 hour');

  if public.normalize_kenyan_phone(p_phone_display) !~ '^254[17][0-9]{8}$' then
    raise exception 'invalid_phone';
  end if;
  if p_fulfillment_type not in ('dropoff','pickup') then raise exception 'invalid_fulfillment'; end if;
  if p_service_id is not null and not exists (select 1 from public.services s where s.id = p_service_id and s.is_active) then
    raise exception 'invalid_service';
  end if;
  if p_service_id is null and coalesce(btrim(p_custom_service), '') = '' then raise exception 'service_required'; end if;
  if p_items is not null and (jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 50) then
    raise exception 'invalid_items';
  end if;

  -- Idempotency: a retried submit (double tap / flaky network) returns the original request.
  if p_client_submission_id is not null then
    select r.id, r.public_request_number into v_id, v_number
      from public.service_requests r where r.client_submission_id = p_client_submission_id;
    if found then id := v_id; public_request_number := v_number; return next; return; end if;
  end if;

  insert into public.service_requests as sr (
    customer_name, phone_display, phone_normalized, email, service_id, custom_service, quantity_approx, weight_approx,
    special_care, stain_notes, general_notes, fulfillment_type, pickup_area, pickup_location, pickup_directions,
    pickup_date, pickup_time, pickup_now, preferred_pickup_datetime, pickup_lat, pickup_lng, pickup_accuracy_m,
    pickup_county, pickup_constituency, pickup_ward, material, custom_material,
    collector_name, collector_phone, collector_relationship, collector_note, client_submission_id
  ) values (
    btrim(p_customer_name), btrim(p_phone_display), '', nullif(btrim(p_email), ''), p_service_id, nullif(btrim(p_custom_service), ''),
    nullif(btrim(p_quantity_approx), ''), nullif(btrim(p_weight_approx), ''), nullif(btrim(p_special_care), ''),
    nullif(btrim(p_stain_notes), ''), nullif(btrim(p_general_notes), ''), p_fulfillment_type,
    nullif(btrim(p_pickup_area), ''), nullif(btrim(p_pickup_location), ''), nullif(btrim(p_pickup_directions), ''),
    p_pickup_date, nullif(btrim(p_pickup_time), ''), coalesce(p_pickup_now, false), p_preferred_pickup_datetime,
    p_pickup_lat, p_pickup_lng, p_pickup_accuracy_m,
    nullif(btrim(p_pickup_county), ''), nullif(btrim(p_pickup_constituency), ''), nullif(btrim(p_pickup_ward), ''),
    nullif(btrim(p_material), ''), nullif(btrim(p_custom_material), ''),
    nullif(btrim(p_collector_name), ''), nullif(btrim(p_collector_phone), ''), nullif(btrim(p_collector_relationship), ''),
    nullif(btrim(p_collector_note), ''), p_client_submission_id
  ) returning sr.id, sr.public_request_number into v_id, v_number;

  if p_items is not null then
    for v_item in select * from jsonb_array_elements(p_items) loop
      if coalesce(btrim(v_item->>'name'), '') <> '' then
        insert into public.request_items (request_id, item_name, quantity, is_custom)
        values (v_id, left(btrim(v_item->>'name'), 100), left(nullif(btrim(v_item->>'quantity'), ''), 50),
                coalesce((v_item->>'isCustom')::boolean, false));
      end if;
    end loop;
  end if;

  id := v_id; public_request_number := v_number; return next;
end $$;

-- Customer tracking. Needs the request number AND the booking phone (or email).
-- Failed guesses are throttled per IP and per request number, so numbers
-- cannot be brute-forced.
create or replace function public.track_request(p_request_number text, p_phone text default null, p_email text default null)
returns table (
  public_request_number text, customer_name text, status text, payment_status text, fulfillment_type text,
  pickup_now boolean, return_method text, created_at timestamptz, completed_at timestamptz,
  service_name text, custom_service text, quantity_approx text, pickup_area text, amount numeric
) language plpgsql security definer set search_path = '' as $$
declare v_norm text := public.normalize_kenyan_phone(p_phone); v_num text := upper(btrim(coalesce(p_request_number, '')));
        v_ok boolean;
begin
  perform public.rate_limit('track_ip', public.client_ip(), 60, interval '15 minutes');
  if (select count(*) from public.rate_limit_events e where e.bucket = 'track_fail' and e.key = v_num and e.created_at > now() - interval '15 minutes') >= 8 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.service_requests r
     where r.public_request_number = v_num
       and ((v_norm is not null and v_norm <> '' and r.phone_normalized = v_norm)
         or (p_email is not null and btrim(p_email) <> '' and lower(r.email) = lower(btrim(p_email))))
  ) into v_ok;

  if not v_ok then
    insert into public.rate_limit_events (bucket, key) values ('track_fail', v_num);
    perform public.rate_limit('track_fail_ip', public.client_ip(), 15, interval '15 minutes');
    return;
  end if;

  return query
    select r.public_request_number, r.customer_name, r.status, r.payment_status, r.fulfillment_type, r.pickup_now,
           r.return_method, r.created_at, r.completed_at, s.name, r.custom_service, r.quantity_approx, r.pickup_area, r.amount
      from public.service_requests r left join public.services s on s.id = r.service_id
     where r.public_request_number = v_num;
end $$;

create or replace function public.track_request_timeline(p_request_number text, p_phone text)
returns table (status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select h.status, h.created_at
    from public.request_status_history h join public.service_requests r on r.id = h.request_id
   where r.public_request_number = upper(btrim(p_request_number))
     and r.phone_normalized = public.normalize_kenyan_phone(p_phone)
   order by h.created_at
$$;

create or replace function public.set_return_preference(
  p_request_number text, p_phone text, p_method text, p_collector_name text default null, p_collector_phone text default null
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_num text := upper(btrim(coalesce(p_request_number, ''))); n int;
begin
  perform public.rate_limit('return_pref', public.client_ip(), 30, interval '15 minutes');
  if p_method not in ('self_collect','delivery','send_someone') then return false; end if;
  if p_method = 'send_someone' and coalesce(btrim(p_collector_name), '') = '' then return false; end if;
  update public.service_requests
     set return_method = p_method,
         return_collector_name  = case when p_method = 'send_someone' then left(btrim(p_collector_name), 100) end,
         return_collector_phone = case when p_method = 'send_someone' then left(btrim(p_collector_phone), 30) end,
         return_set_at = now()
   where public_request_number = v_num
     and phone_normalized = public.normalize_kenyan_phone(p_phone)
     and status in ('ready','processing','picked_up','confirmed','submitted');
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function public.submit_service_request, public.track_request, public.track_request_timeline, public.set_return_preference from public;
grant execute on function public.submit_service_request, public.track_request, public.track_request_timeline, public.set_return_preference to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Storage: public gallery bucket (images only, 8 MB max)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists gallery_objects_public_read on storage.objects;
drop policy if exists gallery_objects_staff_insert on storage.objects;
drop policy if exists gallery_objects_staff_update on storage.objects;
drop policy if exists gallery_objects_staff_delete on storage.objects;
create policy gallery_objects_staff_insert on storage.objects for insert to authenticated with check (bucket_id = 'gallery' and public.is_admin_or_manager());
create policy gallery_objects_staff_update on storage.objects for update to authenticated using (bucket_id = 'gallery' and public.is_admin_or_manager());
create policy gallery_objects_staff_delete on storage.objects for delete to authenticated using (bucket_id = 'gallery' and public.is_admin_or_manager());

-- ----------------------------------------------------------------------------
-- Realtime (live dashboards)
-- ----------------------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['service_requests','notifications','feedback_messages'] loop
    begin execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; when undefined_object then null; end;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Seed data — House of Hannah price list
-- ----------------------------------------------------------------------------
insert into public.services (slug, name, description, price_type, price_amount, price_unit, sort_order) values
  ('wash-fold',       'Wash & Fold',        'Everyday laundry washed, dried and neatly folded.',      'fixed', 100, 'per kg',    10),
  ('wash-fold-iron',  'Wash, Fold & Iron',  'Washed, folded and professionally pressed.',             'fixed', 150, 'per kg',    20),
  ('dry-cleaning',    'Dry Cleaning',       'Specialist care for suits, dresses and delicate garments.', 'on_request', null, null, 30),
  ('duvet-4x6',       'Duvet 4×6',          'Deep-cleaned 4×6 duvet, returned fresh and fluffy.',     'fixed', 500, null,        40),
  ('duvet-5x6',       'Duvet 5×6',          'Deep-cleaned 5×6 duvet, returned fresh and fluffy.',     'fixed', 550, null,        50),
  ('duvet-6x6',       'Duvet 6×6',          'Deep-cleaned 6×6 duvet, returned fresh and fluffy.',     'fixed', 600, null,        60),
  ('bedsheets',       'Bedsheet',           'Bedsheets washed and folded, charged per pair.',         'fixed', 200, 'per pair',  70),
  ('curtains',        'Curtains',           'Curtains cleaned with care, charged per pair.',          'fixed', 200, 'per pair',  80),
  ('shoes',           'Shoes',              'Cleaning and care for shoes and sneakers.',              'fixed', 100, 'per pair',  90),
  ('carpet-cleaning', 'Carpet',             'Professional cleaning for carpets and rugs.',            'fixed', 100, 'per kg',   100),
  ('doormats',        'Doormats',           'Doormats cleaned and refreshed, charged per piece.',     'fixed', 150, 'per piece',110),
  ('other',           'Other',              'Tell us exactly what you need.',                         'on_request', null, null, 999)
on conflict (slug) do nothing;

insert into public.business_settings (id, business_name, tagline, phone, whatsapp_number)
values (1, 'House of Hannah', 'Quality care for every garment', '0745 604 435', '254745604435')
on conflict (id) do nothing;

insert into public.legal_pages (slug, title, content, published_at) values
  ('privacy', 'Privacy Policy', 'We collect only the information needed to process your laundry request — your name, phone number and service details (and your location only if you choose to share it for a pickup). This information is used solely to fulfil your request and is not sold or shared with third parties. To ask about or request deletion of your information, contact us on 0745 604 435.', now()),
  ('terms',   'Terms & Conditions', 'By submitting a laundry request, you agree to provide accurate contact details and to collect or receive your items within a reasonable time of completion. House of Hannah handles all garments with care and recommends disclosing any special fabric requirements or stains at booking.', now())
on conflict (slug) do nothing;

-- =============================================================================
-- FIRST ADMIN (run once, after creating the user under Authentication → Users):
--
--   insert into public.profiles (id, full_name, role)
--   select id, 'Your Name', 'admin' from auth.users where email = 'owner@example.com';
-- =============================================================================
