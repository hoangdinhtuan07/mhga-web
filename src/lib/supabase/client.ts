import { createBrowserClient } from "@supabase/ssr";

/**
 * cookieOptions.maxAge quyết định "Ghi nhớ đăng nhập": luôn truyền tường
 * minh (kể cả undefined) để ghi đè mặc định của @supabase/ssr — nếu không
 * truyền cả object, thư viện tự dùng maxAge mặc định (luôn nhớ đăng nhập),
 * khiến việc bỏ chọn "Ghi nhớ đăng nhập" không có tác dụng.
 */
export function createClient(cookieOptions?: { maxAge?: number }) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions },
  );
}
