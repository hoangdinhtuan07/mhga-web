"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  RegistrationOverviewTable,
  type EmployeeRegistration,
} from "./registration-overview-table";
import type { StoreDef } from "./assignment-table";
import { Step3Content } from "./step3-content";
import { SuggestionStep } from "./suggestion-step";
import { DraftScheduleGrid } from "./draft-schedule-grid";
import type { ScheduleAssignment, ShiftDef } from "@/lib/schedule/assignment";

const STEPS = [
  { id: 1, shortLabel: "Đăng ký", fullLabel: "Lịch đăng ký" },
  { id: 2, shortLabel: "Gợi ý", fullLabel: "Tạo gợi ý lịch" },
  { id: 3, shortLabel: "Chỉnh", fullLabel: "Kiểm tra và chỉnh lịch" },
  { id: 4, shortLabel: "Lịch nháp", fullLabel: "Bảng lịch nháp" },
] as const;

export function ScheduleWizard({
  weekStart,
  weekLabel,
  weekDays,
  employees,
  stores,
  shifts,
  assignments,
  isPublished,
}: {
  weekStart: string;
  weekLabel: string;
  weekDays: string[];
  employees: EmployeeRegistration[];
  stores: StoreDef[];
  shifts: ShiftDef[];
  assignments: ScheduleAssignment[];
  isPublished: boolean;
}) {
  const [step, setStep] = useState(1);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">
        Đăng ký lịch làm việc — tuần {weekLabel}
      </h1>

      {isPublished && (
        <p className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
          ✓ Lịch tuần {weekLabel} đã được công bố — nhân viên đã thấy lịch
          này trên trang chủ. Các bảng nháp bên dưới trống vì mọi ca đã
          chuyển sang chính thức, không phải bị xoá.
        </p>
      )}

      <div className="grid grid-cols-4 gap-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={cn(
              "flex h-11 flex-col items-center justify-center rounded-md border px-1 text-center text-xs font-medium transition-colors md:h-14 md:text-sm",
              step === s.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-input hover:bg-muted",
            )}
          >
            <span className="md:hidden">
              {s.id} {s.shortLabel}
            </span>
            <span className="hidden md:inline">
              {s.id}. {s.fullLabel}
            </span>
          </button>
        ))}
      </div>

      {step === 1 && (
        <RegistrationOverviewTable weekDays={weekDays} employees={employees} />
      )}
      {step === 2 && (
        <SuggestionStep
          weekStart={weekStart}
          weekLabel={weekLabel}
          stores={stores}
          assignments={assignments}
        />
      )}
      {step === 3 && (
        <Step3Content
          weekStart={weekStart}
          weekDays={weekDays}
          stores={stores}
          shifts={shifts}
          assignments={assignments}
          employees={employees}
        />
      )}
      {step === 4 && (
        <DraftScheduleGrid
          weekStart={weekStart}
          weekLabel={weekLabel}
          weekDays={weekDays}
          stores={stores}
          assignments={assignments}
          employees={employees}
          isPublished={isPublished}
        />
      )}
    </div>
  );
}
