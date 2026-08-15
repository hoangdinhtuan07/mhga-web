"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { countStoreDayGaps } from "@/lib/schedule/coverage";
import type { ScheduleAssignment, ShiftDef } from "@/lib/schedule/assignment";
import {
  RegistrationOverviewTable,
  type EmployeeRegistration,
} from "./registration-overview-table";
import { AssignmentTable, type StoreDef } from "./assignment-table";
import { ScheduleReview } from "./schedule-review";
import { MobileShiftEditor } from "./mobile-shift-editor";

// Mục 4.3 Bước 3: 2 tab, mặc định mở tab phải ("Chỉnh lịch"). Tab trái dùng
// lại nguyên component "Lịch đăng ký" từ Bước 1 (7a).
export function Step3Content({
  weekStart,
  weekDays,
  employees,
  stores,
  shifts,
  assignments,
}: {
  weekStart: string;
  weekDays: string[];
  employees: EmployeeRegistration[];
  stores: StoreDef[];
  shifts: ShiftDef[];
  assignments: ScheduleAssignment[];
}) {
  const [tab, setTab] = useState<"registrations" | "edit">("edit");

  const gapCount = countStoreDayGaps(
    stores.map((s) => s.id),
    weekDays,
    assignments,
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">Bước 3 — Kiểm tra và chỉnh lịch</h2>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:inline-flex">
        <button
          type="button"
          onClick={() => setTab("registrations")}
          className={cn(
            "h-11 rounded-lg px-5 text-sm font-medium transition-colors",
            tab === "registrations"
              ? "bg-[var(--fill-primary)] text-[var(--on-primary)]"
              : "bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
          )}
        >
          Lịch đăng ký
        </button>
        <button
          type="button"
          onClick={() => setTab("edit")}
          className={cn(
            "h-11 rounded-lg px-5 text-sm font-medium transition-colors",
            tab === "edit"
              ? "bg-[var(--fill-primary)] text-[var(--on-primary)]"
              : "bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
          )}
        >
          Chỉnh lịch
        </button>
      </div>

      {tab === "registrations" && (
        <RegistrationOverviewTable weekDays={weekDays} employees={employees} />
      )}

      {tab === "edit" && (
        <div className="space-y-4">
          <p className="text-sm">
            Cả tuần còn{" "}
            <span
              className={cn(
                "text-lg font-bold",
                gapCount > 0 ? "text-[var(--text-danger)]" : "text-[var(--text-success)]",
              )}
            >
              {gapCount > 0 ? `${gapCount} chỗ` : "0 chỗ"}
            </span>{" "}
            còn khoảng trống giờ.
          </p>

          {/* Bố cục máy tính: 2 bảng tách biệt */}
          <div className="hidden space-y-6 md:block">
            <AssignmentTable
              weekStart={weekStart}
              weekDays={weekDays}
              stores={stores}
              shifts={shifts}
              assignments={assignments}
              employees={employees}
            />
            <ScheduleReview
              weekStart={weekStart}
              weekDays={weekDays}
              stores={stores}
              assignments={assignments}
              employees={employees}
            />
          </div>

          {/* Bố cục điện thoại: gộp làm một (mục 9) */}
          <div className="md:hidden">
            <MobileShiftEditor
              weekStart={weekStart}
              weekDays={weekDays}
              stores={stores}
              shifts={shifts}
              assignments={assignments}
              employees={employees}
            />
          </div>
        </div>
      )}
    </div>
  );
}
