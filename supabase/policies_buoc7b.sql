-- Bước 7b: RLS cho bảng gán người (Bước 3 tab phải).
-- Chạy trong Supabase Dashboard -> SQL Editor -> Run.
-- Dùng lại hàm is_admin() đã tạo ở supabase/policies_buoc5.sql.

-- stores/shifts là dữ liệu tham chiếu, không nhạy cảm — mọi tài khoản đã
-- đăng nhập đều cần đọc được (nhân viên xem lịch toàn hệ thống ở mục 4.2,
-- admin cần để xếp lịch).
create policy "authenticated can read stores"
  on public.stores
  for select
  to authenticated
  using (true);

create policy "authenticated can read shifts"
  on public.shifts
  for select
  to authenticated
  using (true);

-- Chỉ admin được đọc/ghi bảng lịch chính thức (thêm/bớt người ở Bước 3,
-- và sau này công bố ở Bước 4). Nhân viên chỉ đọc lịch đã publish qua
-- policy riêng sẽ thêm ở Bước 8/9 khi xây trang chủ.
create policy "admins manage schedule"
  on public.schedule
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
