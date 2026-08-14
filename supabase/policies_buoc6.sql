-- Bước 6: RLS + RPC cho trang đăng ký khoảng rảnh (Nhân viên).
-- Chạy trong Supabase Dashboard -> SQL Editor -> Run.

-- Mỗi người chỉ xem/sửa được đăng ký của chính mình (mục 4.2: "Nhân viên
-- chỉ xem và sửa được đăng ký của chính mình, không thấy đăng ký của
-- người khác"). Bước 7 (bảng tổng hợp của admin) sẽ thêm policy riêng cho
-- admin đọc toàn bộ, không thêm ở đây để giữ đúng phạm vi Bước 6.
create policy "users manage own registrations"
  on public.registrations
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Gộp xoá + thêm mới vào 1 transaction để tránh mất dữ liệu nếu 1 trong 2
-- bước lỗi giữa chừng (mỗi lần Lưu là ghi đè toàn bộ đăng ký của tuần đó).
-- security invoker (mặc định) nên hàm vẫn chịu RLS ở trên — chỉ ghi được
-- đúng user_id = auth.uid() của người gọi, không thể ghi hộ người khác dù
-- có ai đó cố gọi hàm với p_week_start tuỳ ý.
create or replace function public.save_registrations(
  p_week_start date,
  p_entries jsonb
)
returns void
language plpgsql
security invoker
as $$
begin
  delete from public.registrations
  where user_id = auth.uid() and week_start = p_week_start;

  insert into public.registrations (user_id, week_start, reg_date, start_hour, end_hour)
  select
    auth.uid(),
    p_week_start,
    (e->>'reg_date')::date,
    (e->>'start_hour')::smallint,
    (e->>'end_hour')::smallint
  from jsonb_array_elements(p_entries) as e;
end;
$$;

grant execute on function public.save_registrations(date, jsonb) to authenticated;
