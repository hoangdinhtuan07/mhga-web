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

function formatDayShort(dateKey: string) {
  const [, m, d] = dateKey.split("-");
  return `${d}/${m}`;
}

// Mục 4.2 + 2.7: liệt kê đủ 7 ngày, ngày không có ca ghi NGHỈ (không bỏ
// trống) — quét mắt nhanh hơn nhiều so với chỉ liệt kê ngày có ca. Danh
// sách dọc dùng chung được cho cả máy tính lẫn điện thoại (mục 9).
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
    <div className="space-y-2 rounded-md border p-4">
      <h2 className="font-medium">
        Lịch làm việc của bạn tuần này · {totalShifts} ca
      </h2>
      <ul className="divide-y">
        {byDay.map(({ day, label, shifts }) => (
          <li
            key={day}
            className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5 text-sm"
          >
            <span className="font-medium">
              {label} {formatDayShort(day)}
            </span>
            {shifts.length === 0 ? (
              <span className="text-muted-foreground">NGHỈ</span>
            ) : (
              <span className="text-right text-muted-foreground">
                {shifts
                  .map(
                    (s) =>
                      `${s.startHour}-${s.endHour}h · ${storesById[s.storeId] ?? "?"}`,
                  )
                  .join(", ")}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
