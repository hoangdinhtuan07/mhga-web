import Link from "next/link";
import { cn } from "@/lib/utils";

export type HomeMenuItem = { label: string; href?: string; locked: boolean };

// Mục 4.2/4.3: mục mở khoá có nền + màu; mục khoá viền nét đứt + 🔒 + "Sắp
// có". Lưới tự xếp dọc trên điện thoại, nhiều cột trên máy tính — không
// cần 2 khối JSX riêng vì đây vốn chỉ là lưới thẻ, tự nhiên reflow theo bề
// rộng màn hình (mục 9).
export function HomeMenu({ items }: { items: HomeMenuItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
      {items.map((item) =>
        item.locked ? (
          <div
            key={item.label}
            className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed text-sm text-muted-foreground"
          >
            <span>🔒 {item.label}</span>
            <span className="text-xs">Sắp có</span>
          </div>
        ) : (
          <Link
            key={item.label}
            href={item.href!}
            className={cn(
              "flex h-16 flex-col items-center justify-center rounded-md border bg-primary/10 text-sm font-medium text-primary hover:bg-primary/20",
            )}
          >
            {item.label}
          </Link>
        ),
      )}
    </div>
  );
}
