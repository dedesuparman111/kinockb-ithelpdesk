-- ============================================================
-- Kino IT Helpdesk Cikembar — Skema Database (Supabase / Postgres)
-- Jalankan di SQL Editor supabase.com pada project baru.
-- ============================================================

-- ---------- Enum peran ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('Administrator', 'Petugas IT', 'User Biasa', 'User Public');
  end if;
end
$$;

-- ---------- Trigger updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- TABEL: profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username varchar not null unique,
  nama varchar not null,
  must_change_password boolean not null default false,
  status varchar not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

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

-- ---------- Fungsi pengecek peran (security definer) ----------
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role in ('Administrator'::public.app_role, 'Petugas IT'::public.app_role)
  );
$$;

-- ---------- Policy profiles ----------
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.has_role(auth.uid(), 'Administrator'))
  with check (public.has_role(auth.uid(), 'Administrator'));

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'Administrator'));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------- Policy user_roles ----------
drop policy if exists user_roles_admin_all on public.user_roles;
create policy user_roles_admin_all on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'Administrator'))
  with check (public.has_role(auth.uid(), 'Administrator'));

drop policy if exists user_roles_select_self_or_admin on public.user_roles;
create policy user_roles_select_self_or_admin on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'Administrator'));

-- ============================================================
-- TABEL: tickets
-- ============================================================
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  ejob varchar not null unique,
  tanggal date not null default current_date,
  nama varchar not null,
  no_wa varchar,
  departement varchar not null,
  lokasi varchar,
  kategori varchar not null,
  type_ticket varchar not null default 'Request',
  subject varchar not null,
  description text not null,
  status varchar not null default 'Open',
  tanggal_selesai date,
  action text,
  keterangan text,
  creator varchar,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tickets_created_at_idx on public.tickets (created_at desc);
create index if not exists tickets_status_idx on public.tickets (status);
create index if not exists tickets_created_by_idx on public.tickets (created_by);

-- no_wa sengaja TIDAK diberikan ke authenticated: nomor kontak hanya
-- dibaca staff lewat fungsi public.ticket_contact().
grant select (
  id, ejob, tanggal, nama, departement, lokasi, kategori, type_ticket,
  subject, description, status, tanggal_selesai, action, keterangan,
  creator, created_by, created_at, updated_at
) on public.tickets to authenticated;
grant insert, update, delete on public.tickets to authenticated;
grant all on public.tickets to service_role;

alter table public.tickets enable row level security;

drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at
before update on public.tickets
for each row execute function public.set_updated_at();

drop policy if exists tickets_select on public.tickets;
create policy tickets_select on public.tickets
  for select to authenticated
  using (true);

drop policy if exists tickets_insert on public.tickets;
create policy tickets_insert on public.tickets
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists tickets_update_staff on public.tickets;
create policy tickets_update_staff on public.tickets
  for update to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

drop policy if exists tickets_delete_staff on public.tickets;
create policy tickets_delete_staff on public.tickets
  for delete to authenticated
  using (public.is_staff(auth.uid()));

-- ---------- Nomor WA hanya untuk staff ----------
create or replace function public.ticket_contact(_ticket_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select t.no_wa
  from public.tickets t
  where t.id = _ticket_id
    and public.is_staff(auth.uid());
$$;

-- ============================================================
-- TABEL: ticket_comments
-- ============================================================
create table if not exists public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name varchar,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ticket_comments_ticket_id_idx
  on public.ticket_comments (ticket_id, created_at desc);

grant select, insert, update, delete on public.ticket_comments to authenticated;
grant all on public.ticket_comments to service_role;

alter table public.ticket_comments enable row level security;

drop trigger if exists trg_ticket_comments_updated on public.ticket_comments;
create trigger trg_ticket_comments_updated
before update on public.ticket_comments
for each row execute function public.set_updated_at();

drop policy if exists ticket_comments_select on public.ticket_comments;
create policy ticket_comments_select on public.ticket_comments
  for select to authenticated
  using (true);

drop policy if exists ticket_comments_insert on public.ticket_comments;
create policy ticket_comments_insert on public.ticket_comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not public.has_role(auth.uid(), 'User Public'::public.app_role)
  );

drop policy if exists ticket_comments_update_own on public.ticket_comments;
create policy ticket_comments_update_own on public.ticket_comments
  for update to authenticated
  using (user_id = auth.uid() and not public.has_role(auth.uid(), 'User Public'::public.app_role))
  with check (user_id = auth.uid());

drop policy if exists ticket_comments_update_staff on public.ticket_comments;
create policy ticket_comments_update_staff on public.ticket_comments
  for update to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

drop policy if exists ticket_comments_delete on public.ticket_comments;
create policy ticket_comments_delete on public.ticket_comments
  for delete to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

-- ============================================================

-- TABEL: settings (satu baris, id = 1)
-- ============================================================
create table if not exists public.settings (
  id integer primary key default 1,
  departments text not null default 'IT,HRD,Finance,Produksi,Warehouse,QA/QC,Logistik,Purchasing',
  categories text not null default 'Hardware,Software,Network,Printer,Email,ERP/System,Lainnya',
  login_bg_url text,
  it_phone varchar default '6281234567890',
  updated_at timestamptz not null default now(),
  constraint settings_single_row check (id = 1)
);

grant select, insert, update, delete on public.settings to authenticated;
grant all on public.settings to service_role;
-- Pengunjung belum login hanya boleh membaca gambar latar halaman login.
grant select (id, login_bg_url) on public.settings to anon;

alter table public.settings enable row level security;

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

drop policy if exists settings_admin_all on public.settings;
create policy settings_admin_all on public.settings
  for all to authenticated
  using (public.has_role(auth.uid(), 'Administrator'))
  with check (public.has_role(auth.uid(), 'Administrator'));

drop policy if exists settings_select_public on public.settings;
create policy settings_select_public on public.settings
  for select to anon, authenticated
  using (true);

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------- Hak eksekusi fungsi ----------
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
revoke all on function public.is_staff(uuid) from public, anon;
revoke all on function public.ticket_contact(uuid) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_staff(uuid) to authenticated, service_role;
grant execute on function public.ticket_contact(uuid) to authenticated, service_role;


-- ======================
-- Seed: admin (email admin@admin.com)
-- Tambahkan profile dan role Administrator untuk user auth yang memiliki email admin@admin.com.
-- Catatan: pastikan auth.user untuk email ini sudah dibuat melalui Supabase Auth (Admin API atau Dashboard).
-- Jangan menyimpan password plaintext di skema ini; buat user lewat Supabase Auth.
-- ======================

do $$
declare
  _uid uuid;
begin
  select id into _uid from auth.users where email = 'admin@admin.com' limit 1;

  if _uid is null then
    raise notice 'No auth.user found for email admin@admin.com. Create the user first via Supabase Auth (Admin API or Dashboard).';
    return;
  end if;

  -- insert atau update profile
  if not exists (select 1 from public.profiles where id = _uid) then
    insert into public.profiles (id, username, nama, must_change_password, status, created_at, updated_at)
    values (_uid, 'admin', 'Administrator', false, 'Active', now(), now());
  else
    update public.profiles
    set username = 'admin', nama = 'Administrator', status = 'Active', updated_at = now()
    where id = _uid;
  end if;

  -- berikan role Administrator
  insert into public.user_roles (user_id, role, created_at)
  values (_uid, 'Administrator'::public.app_role, now())
  on conflict (user_id, role) do nothing;
end
$$;
