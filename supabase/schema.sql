-- Bước 3: tạo 5 bảng theo mục 6 của spec + dữ liệu khởi tạo theo mục 7.
-- Chạy toàn bộ file này trong Supabase Dashboard -> SQL Editor -> Run.

-- ---------------------------------------------------------------------------
-- users: hồ sơ ứng với tài khoản Supabase Auth (id trùng auth.users.id).
-- Mật khẩu do Supabase Auth quản lý, không lưu ở bảng này.
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null unique,
  username text not null unique,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- stores: 5 cửa hàng cố định, mỗi cửa hàng có cấu hình ca riêng (mục 4.1).
-- ---------------------------------------------------------------------------
create table if not exists public.stores (
  id serial primary key,
  name text not null unique,
  allowed_shift_ids integer[] not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- shifts: 5 ca cố định, id giữ đúng 1-5 như mục 7 (không dùng serial).
-- ---------------------------------------------------------------------------
create table if not exists public.shifts (
  id integer primary key,
  name text not null,
  start_hour smallint not null,
  end_hour smallint not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- registrations: khoảng rảnh nhân viên khai báo (bản nháp) theo mục 4.2.
-- week_start = ngày Thứ 2 của tuần (giờ Việt Nam) để tránh nhập nhằng số
-- tuần ISO qua mốc năm mới; reg_date = ngày cụ thể trong tuần đó.
-- ---------------------------------------------------------------------------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  week_start date not null,
  reg_date date not null,
  start_hour smallint not null,
  end_hour smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists registrations_user_week_idx
  on public.registrations (user_id, week_start);

-- ---------------------------------------------------------------------------
-- schedule: lịch chính thức (nháp / đã publish) theo mục 4.3.
-- Lưu theo giờ bắt đầu/kết thúc thay vì shift_id vì ca vá tay có thể lẻ.
-- ---------------------------------------------------------------------------
create table if not exists public.schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  week_start date not null,
  work_date date not null,
  start_hour smallint not null,
  end_hour smallint not null,
  store_id integer not null references public.stores (id),
  source text not null default 'auto' check (source in ('auto', 'manual')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schedule_week_status_idx
  on public.schedule (week_start, status);

create index if not exists schedule_store_date_idx
  on public.schedule (store_id, work_date);

-- ---------------------------------------------------------------------------
-- Bật Row Level Security trên cả 5 bảng. Chưa thêm policy nào ở bước này vì
-- luồng đăng nhập/phân quyền (Bước 4) chưa có — nghĩa là mặc định chặn hết
-- truy cập qua anon key cho tới khi thêm policy dựa trên auth.uid().
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.stores enable row level security;
alter table public.shifts enable row level security;
alter table public.registrations enable row level security;
alter table public.schedule enable row level security;

-- ---------------------------------------------------------------------------
-- Dữ liệu khởi tạo theo mục 7.
-- ---------------------------------------------------------------------------
insert into public.shifts (id, name, start_hour, end_hour) values
  (1, 'Ca 1', 9, 13),
  (2, 'Ca 2', 13, 18),
  (3, 'Ca 3', 18, 22),
  (4, 'Ca 4', 9, 15),
  (5, 'Ca 5', 15, 22)
on conflict (id) do nothing;

insert into public.stores (name, allowed_shift_ids) values
  ('91 Hàng Gai', array[1, 2, 3]),
  ('76 Hàng Gai', array[1, 2, 3, 4, 5]),
  ('15 Hàng Gai', array[1, 2, 3]),
  ('62 Hàng Trống', array[1, 2, 3, 4, 5]),
  ('42 Hàng Ngang', array[1, 2, 3, 4, 5])
on conflict (name) do nothing;
