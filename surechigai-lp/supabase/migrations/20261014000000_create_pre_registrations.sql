-- 事前登録テーブル
create table if not exists public.pre_registrations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (char_length(email) <= 254 and email = lower(email) and email like '%_@_%'),
  gender text not null check (gender in ('male', 'female', 'no_answer')),
  age_group text not null check (age_group in ('20_early', '20_late', '30_early', '30_late')),
  area text check (area in ('sannomiya', 'motomachi', 'kobe_station', 'other')),
  utm_source text check (char_length(utm_source) <= 200),
  utm_medium text check (char_length(utm_medium) <= 200),
  utm_campaign text check (char_length(utm_campaign) <= 200),
  referrer text check (char_length(referrer) <= 500),
  created_at timestamptz not null default now()
);

comment on table public.pre_registrations is 'LPの事前登録（先行招待リスト）。閲覧はSupabaseダッシュボードから。';

-- RLS：匿名ユーザーは INSERT のみ。SELECT / UPDATE / DELETE のポリシーは作らない（= 不可）
alter table public.pre_registrations enable row level security;

revoke all on table public.pre_registrations from anon, authenticated;
grant insert (email, gender, age_group, area, utm_source, utm_medium, utm_campaign, referrer)
  on table public.pre_registrations to anon;

create policy "anon can insert pre_registrations"
  on public.pre_registrations
  for insert
  to anon
  with check (created_at >= now() - interval '1 minute');
