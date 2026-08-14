import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isValidUsername,
  normalizeUsername,
  usernameToEmail,
} from "@/lib/auth/username";

type AdminClient = ReturnType<typeof createAdminClient>;

async function countActiveAdminsExcluding(
  supabaseAdmin: AdminClient,
  excludeId: string,
) {
  const { count } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("status", "active")
    .neq("id", excludeId);
  return count ?? 0;
}

// Trả số ca hiện có của tài khoản — dùng để hộp thoại xoá cảnh báo trước
// khi admin bấm xoá thật (mục 3.2: "cảnh báo tên sẽ biến mất khỏi lịch cũ").
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }
  const { id } = await params;
  const supabaseAdmin = createAdminClient();

  const { count } = await supabaseAdmin
    .from("schedule")
    .select("id", { count: "exact", head: true })
    .eq("user_id", id);

  return NextResponse.json({ shiftCount: count ?? 0 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  const supabaseAdmin = createAdminClient();

  const { data: target } = await supabaseAdmin
    .from("users")
    .select("id, role, status, username")
    .eq("id", id)
    .single();

  if (!target) {
    return NextResponse.json(
      { error: "Không tìm thấy tài khoản." },
      { status: 404 },
    );
  }

  const nextRole =
    body.role === "admin" || body.role === "staff" ? body.role : target.role;
  const nextStatus =
    body.status === "active" || body.status === "inactive"
      ? body.status
      : target.status;

  const willLoseActiveAdmin =
    target.role === "admin" &&
    target.status === "active" &&
    (nextRole !== "admin" || nextStatus !== "active");

  if (willLoseActiveAdmin) {
    if (id === admin.id) {
      return NextResponse.json(
        { error: "Không thể tự hạ quyền hoặc cho chính mình nghỉ." },
        { status: 400 },
      );
    }
    const remaining = await countActiveAdminsExcluding(supabaseAdmin, id);
    if (remaining === 0) {
      return NextResponse.json(
        { error: "Hệ thống phải luôn có ít nhất 1 admin đang hoạt động." },
        { status: 400 },
      );
    }
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.displayName === "string") {
    const displayName = body.displayName.trim();
    if (!displayName) {
      return NextResponse.json(
        { error: "Tên hiển thị không được để trống." },
        { status: 400 },
      );
    }
    updates.display_name = displayName;
  }

  let newUsername: string | undefined;
  if (typeof body.username === "string") {
    newUsername = normalizeUsername(body.username);
    if (!isValidUsername(newUsername)) {
      return NextResponse.json(
        {
          error:
            "Tên đăng nhập chỉ gồm chữ thường, số, dấu chấm, gạch dưới, gạch ngang.",
        },
        { status: 400 },
      );
    }
    updates.username = newUsername;
  }

  if (body.role === "admin" || body.role === "staff") {
    updates.role = body.role;
  }

  if (body.status === "active" || body.status === "inactive") {
    updates.status = body.status;
  }

  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải từ 6 ký tự trở lên." },
        { status: 400 },
      );
    }
    const { error: passwordError } =
      await supabaseAdmin.auth.admin.updateUserById(id, {
        password: body.password,
      });
    if (passwordError) {
      return NextResponse.json(
        { error: "Không đổi được mật khẩu, thử lại." },
        { status: 400 },
      );
    }
  }

  if (newUsername && newUsername !== target.username) {
    const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      { email: usernameToEmail(newUsername) },
    );
    if (emailError) {
      const message = emailError.message
        ?.toLowerCase()
        .includes("already registered")
        ? "Tên đăng nhập đã tồn tại."
        : "Không đổi được tên đăng nhập, thử lại.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      const message =
        updateError.code === "23505"
          ? updateError.message.includes("display_name")
            ? "Tên hiển thị đã tồn tại."
            : "Tên đăng nhập đã tồn tại."
          : "Không lưu được thay đổi, thử lại.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }
  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json(
      { error: "Không thể tự xoá chính mình." },
      { status: 400 },
    );
  }

  const supabaseAdmin = createAdminClient();

  const { data: target } = await supabaseAdmin
    .from("users")
    .select("id, role, status")
    .eq("id", id)
    .single();

  if (!target) {
    return NextResponse.json(
      { error: "Không tìm thấy tài khoản." },
      { status: 404 },
    );
  }

  if (target.role === "admin" && target.status === "active") {
    const remaining = await countActiveAdminsExcluding(supabaseAdmin, id);
    if (remaining === 0) {
      return NextResponse.json(
        { error: "Hệ thống phải luôn có ít nhất 1 admin đang hoạt động." },
        { status: 400 },
      );
    }
  }

  // auth.users -> public.users -> registrations/schedule đều on delete
  // cascade, nên chỉ cần xoá user bên Auth là toàn bộ dữ liệu liên quan
  // (kể cả tên trên lịch cũ) bị xoá theo — đúng như cảnh báo đã hiện
  // trước đó ở hộp thoại xoá.
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (deleteError) {
    return NextResponse.json(
      { error: "Không xoá được tài khoản, thử lại." },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
