import Link from "next/link";
import { Lock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type HomeMenuItem = {
  label: string;
  href?: string;
  locked: boolean;
  icon: LucideIcon;
};

// Khớp .menu trong giao-dien-tham-chieu-mhgaweb.html: mục mở khoá nền
// surface-1, icon màu text-accent; mục khoá nền trong suốt, viền nét đứt
// border, icon+chữ text-muted, kèm "Sắp có".
export function HomeMenu({ items }: { items: HomeMenuItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
      {items.map((item) => {
        const Icon = item.locked ? Lock : item.icon;
        const content = (
          <>
            <Icon
              size={18}
              className={item.locked ? "text-[var(--text-muted)]" : "text-[var(--text-accent)]"}
            />
            <span
              className={cn(
                "text-xs font-medium",
                item.locked ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]",
              )}
            >
              {item.label}
            </span>
            {item.locked && (
              <span className="text-[10px] text-[var(--text-muted)]">Sắp có</span>
            )}
          </>
        );

        if (item.locked) {
          return (
            <div
              key={item.label}
              className="flex flex-col items-start gap-1.5 rounded-[var(--radius)] border border-dashed border-[var(--border)] p-3.5 opacity-60"
            >
              {content}
            </div>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href!}
            className="flex flex-col items-start gap-1.5 rounded-[var(--radius)] bg-[var(--surface-1)] p-3.5 hover:opacity-80"
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}
