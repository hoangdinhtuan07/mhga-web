"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  RegistrationOverviewTable,
  type EmployeeRegistration,
} from "./registration-overview-table";
import { AssignmentTable, type StoreDef } from "./assignment-table";
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
}: {
  weekStart: string;
  weekLabel: string;
  weekDays: string[];
  employees: EmployeeRegistration[];
  stores: StoreDef[];
  shifts: ShiftDef[];
  assignments: ScheduleAssignment[];
}) {
  const [step, setStep] = useState(1);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">
        Đăng ký lịch làm việc — tuần {weekLabel}
      </h1>

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
      {step === 3 && (
        <AssignmentTable
          weekStart={weekStart}
          weekDays={weekDays}
          stores={stores}
          shifts={shifts}
          assignments={assignments}
          employees={employees}
        />
      )}
      {(step === 2 || step === 4) && (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Bước này sẽ được xây ở phần tiếp theo của lộ trình.
        </div>
      )}
    </div>
  );
}
