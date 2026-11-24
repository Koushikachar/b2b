import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  actionHref,
  icon,
  className,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  /** Optional leading icon, shown in the brand-tinted square. */
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-1 flex items-start justify-between gap-2 pb-1 sm:gap-4 ${className ?? ""}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {icon ? (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              {icon}
            </span>
          ) : null}
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {title}
          </h2>
        </div>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actionLabel && actionHref ? (
        // Same line as the title (not the subtitle): h-7 link centred on the h-8 title row.
        <Link href={actionHref} className="mt-0.5 shrink-0">
          <Button
            variant="link"
            size="sm"
            className="h-7 text-sm font-semibold text-primary"
          >
            {actionLabel}
            <span aria-hidden>→</span>
          </Button>
        </Link>
      ) : null}
    </div>
  );
}