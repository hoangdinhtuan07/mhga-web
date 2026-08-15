// Style dùng chung cho mọi bảng lịch (trang chủ, Bước 1, Bước 3, Bước 4) —
// khớp đúng class .sched trong giao-dien-tham-chieu-mhgaweb.html (CHUẨN
// GIAO DIỆN). Gom vào 1 chỗ để không lệch nhau giữa các bảng.

export const TABLE_HEADER_ROW = "bg-[var(--bg-header)]";
export const TABLE_HEADER_CELL = "text-[var(--text-header)] font-medium";
export const TABLE_HEADER_DAY = "border-l-[1.5px] border-l-[var(--border)]";

export const STORE_CELL = "bg-white text-[var(--text-primary)] font-semibold";
export const HOUR_CELL = "bg-white text-[var(--text-secondary)] font-semibold text-center";

export const CELL_FILLED = "bg-[var(--bg-success)] text-[var(--text-success)]";
export const CELL_MINE = "bg-[var(--bg-accent)] text-[var(--text-accent)] font-bold";

// tr.store-start / tr.store-row: đậm giữa các cửa hàng, nhạt giữa các dòng
// ca trong cùng cửa hàng.
export const STORE_START_ROW = "border-t-2 border-t-[var(--border-strong)]";
export const STORE_ROW = "border-t border-t-[var(--border)]";

// ============================================================
// BẢNG LỊCH (trang chủ, Bước 3 "xem lại", Bước 4 "lịch nháp") — kiểu màu
// LẤP KÍN TOÀN Ô: tô nền thẳng lên td, không bo góc, viền trắng mảnh ngăn
// ô. Khác với Bảng gán người (chip) và lưới đăng ký nhân viên ở trên, nên
// tách riêng token, không dùng chung TABLE_HEADER_*/STORE_CELL/HOUR_CELL.
// ============================================================
export const SCHED_HEADER_ROW = "bg-[#ded9fb]";
export const SCHED_HEADER_CELL = "p-[12px_6px] text-[12px] font-semibold text-[#4c3bb8]";
export const SCHED_STORE_CELL = "bg-white p-[14px_10px] font-bold text-[#1c1917]";
export const SCHED_HOUR_CELL = "bg-white p-[14px_10px] text-[12px] text-[#57534e]";
export const SCHED_CELL_BASE =
  "rounded-none border border-white p-[14px_6px] text-center align-middle text-[13px]";
export const SCHED_CELL_FILLED = "bg-[var(--bg-success)] text-[var(--text-success)]";
export const SCHED_CELL_EMPTY = "bg-[var(--bg-danger)]";
export const SCHED_CELL_MINE = "bg-[var(--bg-accent)] font-bold text-[var(--text-accent)]";
export const SCHED_STORE_ROW = "border-t border-t-white";
