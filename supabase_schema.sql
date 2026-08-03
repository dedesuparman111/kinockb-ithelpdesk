-- ============================================================
-- Kino IT Helpdesk — Supabase schema
-- Jalankan di SQL Editor supabase.com (project baru, sekali jalan)
-- ============================================================

-- ---------- Enum peran ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('Administrator', 'Petugas IT', 'User Biasa', 'User Public');
  end if;
end $$;

-- ---------- Helper: updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin new.updated_at = now(); return new; end;
$$;

-- ============================================================
-- TABEL: profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username varchar(50) not null unique,
  nama varchar(120) not null,
  must_change_password boolean not null default false,
  status varchar(20) not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

-- ============================================================
-- TABEL: user_roles
-- ============================================================
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

-- ---------- Fungsi cek peran (security definer, anti-rekursi RLS) ----------
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('Administrator', 'Petugas IT')
  )
$$;

revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.is_staff(uuid) from anon, public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_staff(uuid) to authenticated;

-- ============================================================
-- TABEL: tickets
-- ============================================================
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  ejob varchar(30) not null unique,
  tanggal date not null default current_date,
  nama varchar(120) not null,
  no_wa varchar(30),
  departement varchar(60) not null,
  lokasi varchar(120),
  kategori varchar(60) not null,
  type_ticket varchar(20) not null default 'Request',
  subject varchar(200) not null,
  description text not null,
  status varchar(30) not null default 'Open',
  tanggal_selesai date,
  action text,
  keterangan text,
  creator varchar(50),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tickets_status_idx on public.tickets (status);
create index if not exists tickets_created_by_idx on public.tickets (created_by);
create index if not exists tickets_tanggal_idx on public.tickets (tanggal desc);

-- no_wa (kontak pelapor) tidak dibuka ke user biasa; hanya lewat fungsi ticket_contact
grant select (
  id, ejob, tanggal, nama, departement, lokasi, kategori, type_ticket, subject,
  description, status, tanggal_selesai, action, keterangan, creator, created_by,
  created_at, updated_at
) on public.tickets to authenticated;
grant insert, update, delete on public.tickets to authenticated;
grant all on public.tickets to service_role;

alter table public.tickets enable row level security;

create or replace function public.ticket_contact(_ticket_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select t.no_wa from public.tickets t
  where t.id = _ticket_id and public.is_staff(auth.uid())
$$;

revoke execute on function public.ticket_contact(uuid) from anon, public;
grant execute on function public.ticket_contact(uuid) to authenticated;

-- ============================================================
-- TABEL: settings (baris tunggal, id = 1)
-- ============================================================
create table if not exists public.settings (
  id integer primary key default 1,
  departments text not null default 'IT,HRD,Finance,Produksi,Warehouse,QA/QC,Logistik,Purchasing',
  categories text not null default 'Hardware,Software,Network,Printer,Email,ERP/System,Lainnya',
  login_bg_url text,
  it_phone varchar(30) default '6281234567890',
  updated_at timestamptz not null default now(),
  constraint settings_single_row check (id = 1)
);

grant select, insert, update on public.settings to authenticated;
grant all on public.settings to service_role;
-- anon hanya butuh background halaman login
grant select (id, login_bg_url) on public.settings to anon;

alter table public.settings enable row level security;

-- ============================================================
-- RLS POLICIES
-- ============================================================
-- profiles
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'Administrator'));

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.has_role(auth.uid(), 'Administrator'))
  with check (public.has_role(auth.uid(), 'Administrator'));

-- user_roles
drop policy if exists user_roles_select_self_or_admin on public.user_roles;
create policy user_roles_select_self_or_admin on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'Administrator'));

drop policy if exists user_roles_admin_all on public.user_roles;
create policy user_roles_admin_all on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'Administrator'))
  with check (public.has_role(auth.uid(), 'Administrator'));

-- tickets: semua user login bisa melihat semua tiket
drop policy if exists tickets_select on public.tickets;
create policy tickets_select on public.tickets
  for select to authenticated using (true);

drop policy if exists tickets_insert on public.tickets;
create policy tickets_insert on public.tickets
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists tickets_update_staff on public.tickets;
create policy tickets_update_staff on public.tickets
  for update to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

drop policy if exists tickets_delete_staff on public.tickets;
create policy tickets_delete_staff on public.tickets
  for delete to authenticated using (public.is_staff(auth.uid()));

-- settings
drop policy if exists settings_select_public on public.settings;
create policy settings_select_public on public.settings
  for select to anon, authenticated using (true);

drop policy if exists settings_admin_all on public.settings;
create policy settings_admin_all on public.settings
  for all to authenticated
  using (public.has_role(auth.uid(), 'Administrator'))
  with check (public.has_role(auth.uid(), 'Administrator'));

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at before update on public.tickets
  for each row execute function public.set_updated_at();

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- ============================================================
-- SEED
-- ============================================================
insert into public.settings (id) values (1) on conflict (id) do nothing;
