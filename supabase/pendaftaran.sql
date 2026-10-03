create extension if not exists pgcrypto;

create table if not exists public.private_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  subject text not null check (char_length(trim(subject)) between 1 and 100),
  description text,
  price numeric(12, 2) not null check (price >= 0),
  sessions integer not null check (sessions > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.registration_links (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.private_packages(id) on delete restrict,
  token uuid not null unique default gen_random_uuid(),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.public_registrations (
  id uuid primary key default gen_random_uuid(),
  registration_link_id uuid not null references public.registration_links(id) on delete restrict,
  package_id uuid not null references public.private_packages(id) on delete restrict,
  student_name text not null check (char_length(trim(student_name)) between 1 and 150),
  gender text not null check (gender in ('Laki-laki', 'Perempuan')),
  birth_date date not null check (birth_date <= current_date),
  school text not null check (char_length(trim(school)) between 1 and 180),
  grade text not null check (char_length(trim(grade)) between 1 and 80),
  address text not null check (char_length(trim(address)) between 1 and 500),
  guardian_name text not null check (char_length(trim(guardian_name)) between 1 and 150),
  guardian_relation text not null check (char_length(trim(guardian_relation)) between 1 and 60),
  guardian_phone text not null check (char_length(trim(guardian_phone)) between 6 and 30),
  guardian_email text check (guardian_email is null or char_length(guardian_email) <= 254),
  preferred_schedule text check (preferred_schedule is null or char_length(preferred_schedule) <= 180),
  notes text check (notes is null or char_length(notes) <= 1000),
  status text not null default 'baru' check (status in ('baru', 'dihubungi', 'diterima', 'ditolak')),
  created_at timestamptz not null default now()
);

alter table public.public_registrations
  add column if not exists student_profile_id uuid references public.profiles(id) on delete set null;

create unique index if not exists public_registrations_student_profile_unique
  on public.public_registrations(student_profile_id)
  where student_profile_id is not null;

create table if not exists public.student_schedules (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.public_registrations(id) on delete cascade,
  student_profile_id uuid references public.profiles(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text not null check (char_length(trim(location)) between 1 and 500),
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  constraint student_schedules_no_overlap
    exclude using gist ((tstzrange(starts_at, ends_at, '[)')) with &&)
    where (status = 'scheduled')
);

create index if not exists student_schedules_registration_id_idx on public.student_schedules(registration_id);
create index if not exists student_schedules_student_start_idx on public.student_schedules(student_profile_id, starts_at);

create index if not exists registration_links_package_id_idx on public.registration_links(package_id);
create index if not exists public_registrations_created_at_idx on public.public_registrations(created_at desc);
create index if not exists public_registrations_package_id_idx on public.public_registrations(package_id);

create or replace function public.is_bimbel_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_bimbel_admin() from public, anon;
grant execute on function public.is_bimbel_admin() to authenticated;

alter table public.profiles
  add column if not exists active_from date,
  add column if not exists active_until date,
  add column if not exists is_active boolean not null default false;

create or replace function public.student_has_active_access()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'student'
      and is_active
      and active_from <= (now() at time zone 'Asia/Jakarta')::date
      and active_until >= (now() at time zone 'Asia/Jakarta')::date
  );
$$;

revoke all on function public.student_has_active_access() from public, anon;
grant execute on function public.student_has_active_access() to authenticated;

alter table public.private_packages enable row level security;
alter table public.registration_links enable row level security;
alter table public.public_registrations enable row level security;
alter table public.student_schedules enable row level security;

drop policy if exists "Admins manage private packages" on public.private_packages;
create policy "Admins manage private packages"
  on public.private_packages for all to authenticated
  using (public.is_bimbel_admin())
  with check (public.is_bimbel_admin());

drop policy if exists "Admins manage registration links" on public.registration_links;
create policy "Admins manage registration links"
  on public.registration_links for all to authenticated
  using (public.is_bimbel_admin())
  with check (public.is_bimbel_admin());

drop policy if exists "Admins read public registrations" on public.public_registrations;
create policy "Admins read public registrations"
  on public.public_registrations for select to authenticated
  using (public.is_bimbel_admin());

drop policy if exists "Admins manage student schedules" on public.student_schedules;
create policy "Admins manage student schedules"
  on public.student_schedules for all to authenticated
  using (public.is_bimbel_admin())
  with check (public.is_bimbel_admin());

drop policy if exists "Active students read their schedules" on public.student_schedules;
create policy "Active students read their schedules"
  on public.student_schedules for select to authenticated
  using (student_profile_id = (select auth.uid()) and public.student_has_active_access());

drop policy if exists "Active students reschedule their sessions" on public.student_schedules;
create policy "Active students reschedule their sessions"
  on public.student_schedules for update to authenticated
  using (student_profile_id = (select auth.uid()) and public.student_has_active_access())
  with check (student_profile_id = (select auth.uid()) and public.student_has_active_access());

revoke all on public.private_packages, public.registration_links, public.public_registrations from anon, authenticated;
grant select, insert, update on public.private_packages, public.registration_links to authenticated;
grant select on public.public_registrations to authenticated;
revoke all on public.student_schedules from anon, authenticated;
grant select, update on public.student_schedules to authenticated;
grant select, update on public.public_registrations to service_role;
grant select, insert, update, delete on public.student_schedules to service_role;

create or replace function public.get_public_registration_package(p_token uuid)
returns table (
  id uuid,
  name text,
  subject text,
  description text,
  price numeric,
  sessions integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.name, p.subject, p.description, p.price, p.sessions
  from public.registration_links as l
  join public.private_packages as p on p.id = l.package_id
  where l.token = p_token
    and l.is_active
    and p.is_active;
$$;

revoke all on function public.get_public_registration_package(uuid) from public;
grant execute on function public.get_public_registration_package(uuid) to anon, authenticated;

drop function if exists public.submit_public_registration(uuid, text, text, date, text, text, text, text, text, text, text, text, text);

create or replace function public.submit_public_registration(
  p_token uuid,
  p_student_name text,
  p_gender text,
  p_birth_date date,
  p_school text,
  p_grade text,
  p_address text,
  p_guardian_name text,
  p_guardian_relation text,
  p_guardian_phone text,
  p_schedules jsonb,
  p_guardian_email text default null,
  p_preferred_schedule text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_registration_id uuid;
  registration_link_id uuid;
  selected_package_id uuid;
  expected_sessions integer;
  schedule_value jsonb;
  session_date date;
  schedule_month date;
  session_start time;
  session_end time;
  starts_at timestamptz;
  ends_at timestamptz;
  jakarta_today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if nullif(trim(p_student_name), '') is null
    or p_gender is null or p_gender not in ('Laki-laki', 'Perempuan')
    or p_birth_date is null or p_birth_date > jakarta_today
    or nullif(trim(p_school), '') is null
    or nullif(trim(p_grade), '') is null
    or nullif(trim(p_address), '') is null
    or nullif(trim(p_guardian_name), '') is null
    or nullif(trim(p_guardian_relation), '') is null
    or nullif(trim(p_guardian_phone), '') is null then
    raise exception 'Data pendaftaran tidak lengkap atau tidak valid';
  end if;

  select l.id, p.id, p.sessions
  into registration_link_id, selected_package_id, expected_sessions
  from public.registration_links as l
  join public.private_packages as p on p.id = l.package_id
  where l.token = p_token
    and l.is_active
    and p.is_active;

  if registration_link_id is null then
    raise exception 'Tautan pendaftaran tidak aktif atau tidak ditemukan';
  end if;

  if jsonb_typeof(p_schedules) is distinct from 'array' then
    raise exception 'Pilih tanggal dan jam untuk setiap pertemuan paket';
  end if;

  if jsonb_array_length(p_schedules) <> expected_sessions then
    raise exception 'Pilih tanggal dan jam untuk setiap pertemuan paket';
  end if;

  insert into public.public_registrations (
    registration_link_id,
    package_id,
    student_name,
    gender,
    birth_date,
    school,
    grade,
    address,
    guardian_name,
    guardian_relation,
    guardian_phone,
    guardian_email,
    preferred_schedule,
    notes
  )
  values (
    registration_link_id,
    selected_package_id,
    trim(p_student_name),
    p_gender,
    p_birth_date,
    trim(p_school),
    trim(p_grade),
    trim(p_address),
    trim(p_guardian_name),
    trim(p_guardian_relation),
    trim(p_guardian_phone),
    nullif(trim(p_guardian_email), ''),
    nullif(trim(p_preferred_schedule), ''),
    nullif(trim(p_notes), '')
  )
  returning id into new_registration_id;

  for schedule_value in select value from jsonb_array_elements(p_schedules) as schedules(value) loop
    if jsonb_typeof(schedule_value) is distinct from 'object' then
      raise exception 'Format pilihan jadwal tidak valid';
    end if;

    session_date := nullif(schedule_value->>'date', '')::date;
    session_start := nullif(schedule_value->>'start', '')::time;
    session_end := nullif(schedule_value->>'end', '')::time;

    if session_date is null or session_date < jakarta_today or session_start is null or session_end is null or session_end <= session_start then
      raise exception 'Tanggal atau rentang jam belajar tidak valid';
    end if;

    if schedule_month is null then
      schedule_month := date_trunc('month', session_date)::date;
    elsif date_trunc('month', session_date)::date <> schedule_month then
      raise exception 'Semua pertemuan dalam satu paket harus dijadwalkan pada bulan yang sama';
    end if;

    starts_at := (session_date + session_start) at time zone 'Asia/Jakarta';
    ends_at := (session_date + session_end) at time zone 'Asia/Jakarta';
    if starts_at <= now() then
      raise exception 'Jam belajar harus dipilih di waktu mendatang';
    end if;

    insert into public.student_schedules (registration_id, starts_at, ends_at, location)
    values (new_registration_id, starts_at, ends_at, trim(p_address));
  end loop;

  return new_registration_id;
exception
  when exclusion_violation then
    raise exception 'Jadwal yang dipilih bertabrakan dengan jadwal siswa lain. Silakan pilih tanggal atau jam berbeda.';
end;
$$;

revoke all on function public.submit_public_registration(uuid, text, text, date, text, text, text, text, text, text, jsonb, text, text, text) from public;
grant execute on function public.submit_public_registration(uuid, text, text, date, text, text, text, text, text, text, jsonb, text, text, text) to anon, authenticated;

-- Setelah membuat akun admin melalui Authentication > Users, jadikan akun tersebut admin:
-- update public.profiles set role = 'admin' where id = 'UUID-AKUN-AUTH';

alter table public.profiles
  add column if not exists student_id text,
  add column if not exists email text,
  add column if not exists active_from date,
  add column if not exists active_until date,
  add column if not exists is_active boolean not null default false;

create sequence if not exists public.student_id_seq;

create or replace function public.generate_student_id()
returns text
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  select 'BC-' || nextval('public.student_id_seq')::text;
$$;

create or replace function public.assign_student_id()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role = 'student' and nullif(trim(new.student_id), '') is null then
    new.student_id := public.generate_student_id();
  end if;

  return new;
end;
$$;

revoke all on function public.generate_student_id() from public, anon, authenticated;
revoke all on function public.assign_student_id() from public, anon, authenticated;

drop trigger if exists profiles_assign_student_id on public.profiles;
create trigger profiles_assign_student_id
  before insert or update of role, student_id on public.profiles
  for each row execute function public.assign_student_id();

update public.profiles
set student_id = public.generate_student_id()
where role = 'student'
  and nullif(trim(student_id), '') is null;

create unique index if not exists profiles_student_id_unique
  on public.profiles(student_id)
  where student_id is not null;

alter table public.profiles enable row level security;

drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Admins read student profiles" on public.profiles;
create policy "Admins read student profiles"
  on public.profiles for select to authenticated
  using (public.is_bimbel_admin());

drop policy if exists "Admins update student profiles" on public.profiles;
create policy "Admins update student profiles"
  on public.profiles for update to authenticated
  using (public.is_bimbel_admin())
  with check (public.is_bimbel_admin());

grant select, update on public.profiles to authenticated;

create or replace function public.guard_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_bimbel_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
    or new.student_id is distinct from old.student_id
    or new.is_active is distinct from old.is_active
    or new.active_from is distinct from old.active_from
    or new.active_until is distinct from old.active_until then
    if old.role = 'student'
      and auth.uid() = old.id
      and old.is_active
      and not new.is_active
      and old.active_until is not null
      and old.active_until < (now() at time zone 'Asia/Jakarta')::date
      and to_jsonb(new) - 'is_active' = to_jsonb(old) - 'is_active' then
      return new;
    end if;

    raise exception 'Hanya admin yang dapat mengubah akun dan masa aktif siswa';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_profile_admin_fields() from public, anon, authenticated;

drop trigger if exists profiles_guard_admin_fields on public.profiles;
create trigger profiles_guard_admin_fields
  before update of role, student_id, is_active, active_from, active_until on public.profiles
  for each row execute function public.guard_profile_admin_fields();

create or replace function public.refresh_student_access()
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  jakarta_today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  update public.profiles
  set is_active = false
  where id = (select auth.uid())
    and role = 'student'
    and is_active
    and (active_from is null or active_until is null or active_until < jakarta_today);

  return exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'student'
      and is_active
      and active_from <= jakarta_today
      and active_until >= jakarta_today
  );
end;
$$;

revoke all on function public.refresh_student_access() from public, anon;
grant execute on function public.refresh_student_access() to authenticated;

create or replace function public.guard_student_schedule_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_bimbel_admin() then
    return new;
  end if;

  if old.student_profile_id = (select auth.uid())
    and old.status = 'scheduled'
    and old.starts_at >= now() + interval '24 hours'
    and new.student_profile_id is not distinct from old.student_profile_id
    and new.status = old.status
    and new.starts_at > now()
    and new.ends_at > new.starts_at
    and to_jsonb(new) - 'starts_at' - 'ends_at' = to_jsonb(old) - 'starts_at' - 'ends_at' then
    return new;
  end if;

  raise exception 'Reschedule hanya dapat dilakukan lebih dari 24 jam sebelum sesi dan hanya untuk jadwal milik sendiri';
end;
$$;

revoke all on function public.guard_student_schedule_update() from public, anon, authenticated;

drop trigger if exists student_schedules_guard_reschedule on public.student_schedules;
create trigger student_schedules_guard_reschedule
  before update on public.student_schedules
  for each row execute function public.guard_student_schedule_update();
