-- Bước 7d: RLS cho phép mọi tài khoản đã đăng nhập đọc lịch ĐÃ CÔNG BỐ
-- (chưa cho đọc bản nháp — đó vẫn là việc riêng của admin qua is_admin()).
-- Cần cho: (1) trang /register kiểm tra khoá đăng ký khi lịch tuần đó đã
-- công bố sớm, (2) trang chủ nhân viên/admin (Bước 8/9) hiển thị lịch.
-- Chạy trong Supabase Dashboard -> SQL Editor -> Run.

create policy "authenticated can read published schedule"
  on public.schedule
  for select
  to authenticated
  using (status = 'published');
