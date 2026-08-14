/**
 * Mọi mốc thời gian trong hệ thống tính theo giờ Việt Nam (UTC+7), không
 * dùng giờ local của server (mục 4.0) — server chạy UTC (Vercel) sẽ tính
 * sai mốc "hết Thứ 7" lệch 7 tiếng nếu dùng Date.getDay()/getHours() trực
 * tiếp. Cách làm đúng: cộng offset cố định vào epoch ms rồi đọc lại bằng
 * các hàm getUTC*, không dùng hàm local (getDay/getHours) hay Intl.
 */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type CalendarDate = { year: number; month: number; day: number };

export type VnNow = CalendarDate & {
  isoWeekday: number; // 1 = Thứ 2 ... 7 = Chủ nhật
  hour: number;
};

export function getVnNow(date: Date = new Date()): VnNow {
  const shifted = new Date(date.getTime() + VN_OFFSET_MS);
  const jsWeekday = shifted.getUTCDay(); // 0 = Chủ nhật theo quy ước JS
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    isoWeekday: jsWeekday === 0 ? 7 : jsWeekday,
    hour: shifted.getUTCHours(),
  };
}

function addDays(date: CalendarDate, deltaDays: number): CalendarDate {
  const ms = Date.UTC(date.year, date.month, date.day) + deltaDays * DAY_MS;
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
  };
}

export function toDateKey({ year, month, day }: CalendarDate): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function getCurrentWeekMonday(now: VnNow): CalendarDate {
  return addDays(now, -(now.isoWeekday - 1));
}

// Nhân viên luôn đăng ký cho "tuần kế tiếp" tính từ tuần hiện tại (mục 4.2).
export function getTargetRegistrationWeekMonday(now: VnNow): CalendarDate {
  return addDays(getCurrentWeekMonday(now), 7);
}

export function getWeekDays(monday: CalendarDate): CalendarDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// Đóng đăng ký suốt ngày Chủ nhật (mục 4.2: "Từ Chủ nhật ... cho tới hết Chủ nhật").
export function isRegistrationLocked(now: VnNow): boolean {
  return now.isoWeekday === 7;
}

// Hạn chót là hết ngày Thứ 7 (isoWeekday 6). 0 nghĩa là hôm nay là hạn chót.
export function daysUntilDeadline(now: VnNow): number {
  return Math.max(0, 6 - now.isoWeekday);
}

export function formatWeekLabel(monday: CalendarDate): string {
  const [first, , , , , , last] = getWeekDays(monday);
  const dd = (d: CalendarDate) => String(d.day).padStart(2, "0");
  const mm = (d: CalendarDate) => String(d.month + 1).padStart(2, "0");
  if (first.month === last.month) {
    return `${dd(first)} - ${dd(last)}/${mm(last)}`;
  }
  return `${dd(first)}/${mm(first)} - ${dd(last)}/${mm(last)}`;
}
