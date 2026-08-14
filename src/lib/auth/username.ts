/**
 * Supabase Auth cần email, nhưng nhân viên đăng nhập bằng "tên đăng nhập"
 * (mục 3.1). Quy ước: mỗi username tương ứng 1 email nội bộ giả định theo
 * domain cố định dưới đây — không gửi mail thật, chỉ dùng để Supabase Auth
 * định danh tài khoản. Bước 5 (tạo tài khoản) phải dùng đúng hàm này khi
 * tạo user trong Supabase Auth để khớp với luồng đăng nhập.
 */
const USERNAME_EMAIL_DOMAIN = "mhga.local";

export function usernameToEmail(username: string): string {
  return `${username}@${USERNAME_EMAIL_DOMAIN}`;
}

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}
