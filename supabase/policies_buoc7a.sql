-- Bước 7a: RLS policy cho phép admin đọc toàn bộ đăng ký (mọi nhân viên)
-- để hiển thị bảng "Lịch đăng ký" ở Bước 1 của luồng xếp lịch admin.
-- Chạy trong Supabase Dashboard -> SQL Editor -> Run.
-- Dùng lại hàm is_admin() đã tạo ở supabase/policies_buoc5.sql.

create policy "admins can read all registrations"
  on public.registrations
  for select
  to authenticated
  using (public.is_admin());
