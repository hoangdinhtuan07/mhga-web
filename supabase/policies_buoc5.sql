-- Bước 5: RLS policy cần cho trang Quản lý tài khoản (chỉ phần đọc danh
-- sách — mọi thao tác ghi/tạo/xoá tài khoản đều đi qua Route Handler dùng
-- service_role key, bỏ qua RLS nên không cần policy ghi ở đây).
-- Chạy trong Supabase Dashboard -> SQL Editor -> Run.

-- security definer để tránh việc policy tự tham chiếu vào chính bảng nó
-- đang bảo vệ (public.users) gây đệ quy khi Postgres đánh giá RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

create policy "admins can read all profiles"
  on public.users
  for select
  to authenticated
  using (public.is_admin());
