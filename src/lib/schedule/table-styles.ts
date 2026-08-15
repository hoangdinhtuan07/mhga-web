// Style dùng chung cho mọi bảng lịch (trang chủ, Bước 1, Bước 3, Bước 4) —
// khớp đúng class .sched trong giao-dien-tham-chieu-mhgaweb.html (CHUẨN
// GIAO DIỆN). Gom vào 1 chỗ để không lệch nhau giữa các bảng.

export const TABLE_HEADER_ROW = "bg-[var(--bg-header)]";
export const TABLE_HEADER_CELL = "text-[var(--text-header)] font-medium";
export const TABLE_HEADER_DAY = "border-l-[1.5px] border-l-[var(--border)]";

export const STORE_CELL = "bg-[var(--surface-1)] text-[var(--text-primary)] font-semibold";
export const HOUR_CELL = "bg-[var(--surface-1)] text-[var(--text-secondary)]";

export const CELL_BASE = "border-l-[1.5px] border-l-[var(--border)]";
export const CELL_FILLED = "bg-[var(--bg-success)] text-[var(--text-success)]";
export const CELL_EMPTY = "bg-[var(--bg-danger)] text-[var(--text-danger)]";
export const CELL_MINE = "bg-[var(--bg-accent)] text-[var(--text-accent)] font-bold";

// tr.store-start / tr.store-row: đậm giữa các cửa hàng, nhạt giữa các dòng
// ca trong cùng cửa hàng.
export const STORE_START_ROW = "border-t-2 border-t-[var(--border-strong)]";
export const STORE_ROW = "border-t border-t-[var(--border)]";
