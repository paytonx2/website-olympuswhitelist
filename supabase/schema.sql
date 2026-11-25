-- =============================================================
-- OLYMPUS ACADEMY — Whitelist system schema
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run
-- =============================================================

-- ผู้เล่น (สร้าง/อัปเดตอัตโนมัติทุกครั้งที่ล็อกอินด้วย Discord)
create table if not exists public.profiles (
  discord_id   text primary key,
  username     text not null,
  global_name  text,
  avatar       text,
  created_at   timestamptz not null default now(),
  last_login   timestamptz not null default now()
);

-- ทีมงาน (admin = ทำได้ทุกอย่าง, reviewer = ตรวจใบสมัคร, finance = ตรวจสลิปเท่านั้น)
create table if not exists public.staff (
  discord_id  text primary key,
  role        text not null check (role in ('admin','reviewer','finance')),
  note        text,
  added_by    text,
  created_at  timestamptz not null default now()
);

-- ตั้งค่าเว็บ (key/value)
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

-- ใบสมัคร Whitelist
create table if not exists public.applications (
  id               uuid primary key default gen_random_uuid(),
  discord_id       text not null references public.profiles(discord_id),
  category         text not null check (category in ('student','teacher','demigod','extra')),
  tier             text not null default 'normal' check (tier in ('normal','express')),
  lineage          text,          -- ลูกครึ่งเทพ: สายเลือด
  extra_role       text,          -- Extra Role: ตำแหน่ง
  status           text not null default 'pending'
                   check (status in ('pending','reviewing','needs_edit','interview','approved','rejected')),

  ic_name          text not null,
  ic_name_reading  text not null,
  academic_year    text not null,
  oc_age           int  not null,
  oc_gender        text not null,
  hair_eye_color   text not null,
  steam_hex        text not null,
  facebook_url     text not null,
  email            text not null,

  pdf_path         text not null,
  slip_path        text,
  payment_verified boolean not null default false,
  payment_verified_by text,

  claimed_by       text,
  claimed_at       timestamptz,
  decided_by       text,
  decided_at       timestamptz,
  reason           text,          -- เหตุผลที่ผู้เล่นเห็น
  internal_note    text,          -- โน้ตภายในทีมงาน
  revision         int  not null default 0,
  role_sync        text,          -- ผลการให้ยศ Discord: ok / failed:<msg>

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists applications_discord_idx  on public.applications(discord_id);
create index if not exists applications_status_idx   on public.applications(status);
create index if not exists applications_steam_idx    on public.applications(lower(steam_hex));
create index if not exists applications_created_idx  on public.applications(created_at desc);

-- ประวัติ/Audit log ของใบสมัคร
create table if not exists public.application_events (
  id              bigserial primary key,
  application_id  uuid references public.applications(id) on delete cascade,
  actor_id        text,
  action          text not null,
  detail          jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists events_app_idx on public.application_events(application_id, created_at);
create index if not exists events_created_idx on public.application_events(created_at desc);

-- เปิด RLS ทุกตาราง และไม่สร้าง policy → anon key อ่าน/เขียนตรงไม่ได้
-- เว็บเข้าถึงข้อมูลผ่าน service_role key ฝั่งเซิร์ฟเวอร์เท่านั้น
alter table public.profiles           enable row level security;
alter table public.staff              enable row level security;
alter table public.settings           enable row level security;
alter table public.applications       enable row level security;
alter table public.application_events enable row level security;

-- Storage bucket สำหรับไฟล์ PDF และสลิป (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('whitelist', 'whitelist', false, 10485760,
        array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
