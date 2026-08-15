import { cn } from "@/lib/utils";
import type { ScheduleAssignment } from "@/lib/schedule/assignment";

const WEEKDAY_LABELS = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
];

// Khớp .mine trong giao-dien-tham-chieu-mhgaweb.html: nền bg-accent, hàng
// xếp trái (tên thứ cột cố định rồi tới nội dung), không dàn 2 đầu.
export function PersonalWeekBlock({
  weekDays,
  assignments,
  userId,
  storesById,
}: {
  weekDays: string[];
  assignments: ScheduleAssignment[];
  userId: string;
  storesById: Record<number, string>;
}) {
  const byDay = weekDays.map((day, i) => ({
    day,
    label: WEEKDAY_LABELS[i],
    shifts: assignments
      .filter((a) => a.userId === userId && a.workDate === day)
      .sort((a, b) => a.startHour - b.startHour),
  }));

  const totalShifts = byDay.reduce((sum, d) => sum + d.shifts.length, 0);

  return (
    <div className="rounded-[var(--radius)] bg-[var(--bg-accent)] px-4 py-3.5">
      <p className="mb-1 text-sm font-semibold text-[var(--text-accent)]">
        Lịch làm việc của bạn tuần này ({totalShifts} ca)
      </p>
      {byDay.map(({ day, label, shifts }, i) => (
        <div
          key={day}
          className={cn(
            "flex gap-3 py-1.5 text-sm",
            i > 0 && "border-t border-t-[rgba(30,64,175,0.12)]",
          )}
        >
          <span className="w-16 shrink-0 font-semibold text-[var(--text-accent)]">
            {label}
          </span>
          {shifts.length === 0 ? (
            <span className="font-semibold tracking-wide text-[var(--text-muted)]">
              NGHỈ
            </span>
          ) : (
            <span className="text-[var(--text-accent)]">
              {shifts
                .map(
                  (s) =>
                    `${s.startHour}-${s.endHour}h · ${storesById[s.storeId] ?? "?"}`,
                )
                .join(", ")}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
