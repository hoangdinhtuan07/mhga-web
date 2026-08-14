import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isValidUsername,
  normalizeUsername,
  usernameToEmail,
} from "@/lib/auth/username";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const body = await request.json();
  const displayName = String(body.displayName ?? "").trim();
  const username = normalizeUsername(String(body.username ?? ""));
  const role = body.role === "admin" ? "admin" : "staff";
  const password = String(body.password ?? "");

  if (!displayName) {
    return NextResponse.json(
      { error: "Tên hiển thị không được để trống." },
      { status: 400 },
    );
  }
  if (!isValidUsername(username)) {
    return NextResponse.json(
      {
        error:
          "Tên đăng nhập chỉ gồm chữ thường, số, dấu chấm, gạch dưới, gạch ngang.",
      },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Mật khẩu phải từ 6 ký tự trở lên." },
      { status: 400 },
    );
  }

  const supabaseAdmin = createAdminClient();

  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(username),
      password,
      email_confirm: true,
    });

  if (createError || !created.user) {
    const message = createError?.message
      ?.toLowerCase()
      .includes("already registered")
      ? "Tên đăng nhập đã tồn tại."
      : "Không tạo được tài khoản, thử lại.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { error: profileError } = await supabaseAdmin.from("users").insert({
    id: created.user.id,
    display_name: displayName,
    username,
    role,
    status: "active",
  });

  if (profileError) {
    // Dọn lại user vừa tạo trong Auth để không sót tài khoản mồ côi.
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    const message =
      profileError.code === "23505"
        ? profileError.message.includes("display_name")
          ? "Tên hiển thị đã tồn tại."
          : "Tên đăng nhập đã tồn tại."
        : "Không lưu được hồ sơ tài khoản, thử lại.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ username, password, displayName, role });
}
