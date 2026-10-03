-- Jalankan setelah supabase/pendaftaran.sql. Fungsi is_bimbel_admin() disediakan oleh skrip tersebut.
create extension if not exists pgcrypto;

create table if not exists public.job_openings (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 150),
  department text not null check (char_length(trim(department)) between 1 and 120),
  employment_type text not null check (employment_type in ('Full-time', 'Part-time', 'Kontrak', 'Freelance', 'Magang')),
  location text not null check (char_length(trim(location)) between 1 and 180),
  work_arrangement text not null check (work_arrangement in ('WFO', 'WFH', 'Hybrid')),
  salary_min numeric(14, 2) check (salary_min is null or salary_min >= 0),
  salary_max numeric(14, 2) check (salary_max is null or salary_max >= 0),
  description text not null check (char_length(trim(description)) between 1 and 10000),
  responsibilities text not null check (char_length(trim(responsibilities)) between 1 and 10000),
  requirements text not null check (char_length(trim(requirements)) between 1 and 10000),
  benefits text,
  application_deadline date not null,
  contact_email text not null check (char_length(trim(contact_email)) <= 254),
  contact_phone text not null check (char_length(trim(contact_phone)) between 6 and 30),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check (salary_min is null or salary_max is null or salary_max >= salary_min)
);

create table if not exists public.job_applicants (
  id uuid primary key default gen_random_uuid(),
  job_opening_id uuid not null references public.job_openings(id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) between 1 and 150),
  email text not null check (char_length(trim(email)) between 3 and 254),
  phone text not null check (char_length(trim(phone)) between 6 and 30),
  birth_date date not null check (birth_date <= current_date),
  gender text not null check (gender in ('Laki-laki', 'Perempuan')),
  address text not null check (char_length(trim(address)) between 1 and 1000),
  education_level text not null check (education_level in ('SMA/SMK', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3', 'Lainnya')),
  education_institution text not null check (char_length(trim(education_institution)) between 1 and 180),
  education_major text not null check (char_length(trim(education_major)) between 1 and 150),
  graduation_year integer not null check (graduation_year between 1950 and 2100),
  experience_years numeric(4, 1) not null check (experience_years between 0 and 80),
  experience_summary text not null check (char_length(trim(experience_summary)) between 1 and 5000),
  skills text[] not null check (cardinality(skills) between 1 and 30),
  portfolio_url text check (portfolio_url is null or (char_length(portfolio_url) <= 500 and portfolio_url ~* '^https?://')),
  social_platform text not null check (social_platform in ('Instagram', 'LinkedIn', 'Facebook')),
  social_url text not null check (char_length(trim(social_url)) between 1 and 500 and social_url ~* '^https?://'),
  cover_letter text not null check (char_length(trim(cover_letter)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists job_openings_status_deadline_idx
  on public.job_openings(status, application_deadline);
create index if not exists job_applicants_opening_created_idx
  on public.job_applicants(job_opening_id, created_at desc);

alter table public.job_openings enable row level security;
alter table public.job_applicants enable row level security;

drop policy if exists "Admins manage job openings" on public.job_openings;
create policy "Admins manage job openings"
  on public.job_openings for all to authenticated
  using (public.is_bimbel_admin())
  with check (public.is_bimbel_admin());

drop policy if exists "Admins read job applicants" on public.job_applicants;
create policy "Admins read job applicants"
  on public.job_applicants for select to authenticated
  using (public.is_bimbel_admin());

revoke all on public.job_openings, public.job_applicants from anon, authenticated;
grant select, insert, update on public.job_openings to authenticated;
grant select on public.job_applicants to authenticated;

create or replace function public.get_public_job_opening(p_token uuid)
returns table (
  id uuid,
  title text,
  department text,
  employment_type text,
  location text,
  work_arrangement text,
  salary_min numeric,
  salary_max numeric,
  description text,
  responsibilities text,
  requirements text,
  benefits text,
  application_deadline date,
  contact_email text,
  contact_phone text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select j.id, j.title, j.department, j.employment_type, j.location, j.work_arrangement,
    j.salary_min, j.salary_max, j.description, j.responsibilities, j.requirements,
    j.benefits, j.application_deadline, j.contact_email, j.contact_phone
  from public.job_openings as j
  where j.token = p_token
    and j.status = 'open'
    and j.application_deadline >= (now() at time zone 'Asia/Jakarta')::date;
$$;

revoke all on function public.get_public_job_opening(uuid) from public;
grant execute on function public.get_public_job_opening(uuid) to anon, authenticated;

create or replace function public.submit_job_application(
  p_token uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_birth_date date,
  p_gender text,
  p_address text,
  p_education_level text,
  p_education_institution text,
  p_education_major text,
  p_graduation_year integer,
  p_experience_years numeric,
  p_experience_summary text,
  p_skills text[],
  p_portfolio_url text,
  p_social_platform text,
  p_social_url text,
  p_cover_letter text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_job_id uuid;
  new_application_id uuid;
begin
  select j.id into selected_job_id
  from public.job_openings as j
  where j.token = p_token
    and j.status = 'open'
    and j.application_deadline >= (now() at time zone 'Asia/Jakarta')::date
  for update;

  if selected_job_id is null then
    raise exception 'Lowongan sudah ditutup atau batas lamaran telah berakhir';
  end if;

  if nullif(trim(p_full_name), '') is null
    or nullif(trim(p_email), '') is null
    or nullif(trim(p_phone), '') is null
    or p_birth_date is null or p_birth_date > (now() at time zone 'Asia/Jakarta')::date
    or p_gender is null or p_gender not in ('Laki-laki', 'Perempuan')
    or nullif(trim(p_address), '') is null
    or p_education_level is null or p_education_level not in ('SMA/SMK', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3', 'Lainnya')
    or nullif(trim(p_education_institution), '') is null
    or nullif(trim(p_education_major), '') is null
    or p_graduation_year is null or p_graduation_year not between 1950 and 2100
    or p_experience_years is null or p_experience_years not between 0 and 80
    or nullif(trim(p_experience_summary), '') is null
    or coalesce(cardinality(p_skills), 0) not between 1 and 30
    or exists (
      select 1
      from unnest(coalesce(p_skills, '{}'::text[])) as skills(skill)
      where char_length(trim(skill)) > 100
    )
    or p_social_platform is null or p_social_platform not in ('Instagram', 'LinkedIn', 'Facebook')
    or nullif(trim(p_social_url), '') is null
    or trim(p_social_url) !~* '^https?://'
    or (nullif(trim(p_portfolio_url), '') is not null and trim(p_portfolio_url) !~* '^https?://')
    or nullif(trim(p_cover_letter), '') is null then
    raise exception 'Data pelamar belum lengkap atau tidak valid';
  end if;

  insert into public.job_applicants (
    job_opening_id, full_name, email, phone, birth_date, gender, address,
    education_level, education_institution, education_major, graduation_year,
    experience_years, experience_summary, skills, portfolio_url,
    social_platform, social_url, cover_letter
  )
  values (
    selected_job_id, trim(p_full_name), lower(trim(p_email)), trim(p_phone), p_birth_date,
    p_gender, trim(p_address), p_education_level, trim(p_education_institution),
    trim(p_education_major), p_graduation_year, p_experience_years,
    trim(p_experience_summary),
    array(select trim(skill) from unnest(p_skills) as skills(skill) where trim(skill) <> ''),
    nullif(trim(p_portfolio_url), ''), p_social_platform, trim(p_social_url), trim(p_cover_letter)
  )
  returning id into new_application_id;

  return new_application_id;
end;
$$;

revoke all on function public.submit_job_application(uuid, text, text, text, date, text, text, text, text, text, integer, numeric, text, text[], text, text, text, text) from public;
grant execute on function public.submit_job_application(uuid, text, text, text, date, text, text, text, text, text, integer, numeric, text, text[], text, text, text, text) to anon, authenticated;
