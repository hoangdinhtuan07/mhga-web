-- Bước 4: RLS policy cần cho luồng đăng nhập + phân quyền.
-- Chạy trong Supabase Dashboard -> SQL Editor -> Run (sau khi đã chạy
-- supabase/schema.sql ở Bước 3).

-- Cho phép người dùng đã đăng nhập đọc CHÍNH hồ sơ của mình trong bảng
-- users, để trang đăng nhập và middleware biết vai trò (admin/staff) và
-- trạng thái (active/inactive) ngay sau khi Supabase Auth xác thực thành
-- công. Chưa cho đọc hồ sơ người khác — việc đó dành cho Bước 5 (trang
-- quản lý tài khoản, chỉ admin mới cần quyền đó).
create policy "users can read own profile"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);
