import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { cn } from "cn";
import type { OrderStatus } from "@/lib/orders/lifecycle";
import { orderSteps, type OrderStepState } from "@/lib/orders/order-steps";

// Order tracker: the same steps the buyer sees (lib/orders/order-steps.ts),
// marked only from what the database recorded.

function StepCircle({ state, index }: { state: OrderStepState; index: number }) {
  if (state === "done") {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-success bg-success text-white">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold tabular-nums",
        state === "current" && "border-primary bg-primary/10 text-primary",
        state === "failed" && "border-destructive bg-destructive/10 text-destructive",
        state === "upcoming" && "border-border bg-card text-muted-foreground",
      )}
    >
      {state === "failed" ? "✕" : index + 1}
    </span>
  );
}

const labelTone: Record<OrderStepState, string> = {
  done: "text-foreground",
  current: "font-semibold text-primary",
  failed: "font-semibold text-destructive",
  upcoming: "text-muted-foreground",
};

export function OrderProgress({
  status,
  paid,
  cancelledReason,
}: {
  status: OrderStatus;
  paid: boolean;
  cancelledReason?: string | null;
}) {
  const steps = orderSteps(status, paid);

  return (
    <div aria-label="Order progress">
      <ol className="flex flex-col gap-0 md:flex-row">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li key={step.key} className="flex min-w-0 gap-3 md:flex-1 md:flex-col md:items-center md:gap-0">
              <div className="flex flex-col items-center md:w-full md:flex-row">
                <span
                  className={cn(
                    "hidden h-0.5 flex-1 md:block",
                    index === 0 ? "bg-transparent" : steps[index - 1].state === "done" ? "bg-success" : "bg-border",
                  )}
                />
                <StepCircle state={step.state} index={index} />
                <span
                  className={cn(
                    "w-0.5 flex-1 md:h-0.5 md:w-auto",
                    isLast ? "bg-transparent" : step.state === "done" ? "bg-success" : "bg-border",
                  )}
                />
              </div>
              <span
                className={cn(
                  "pt-0.5 text-sm md:mt-2 md:px-1 md:pt-0 md:text-center md:text-[11px] md:leading-tight",
                  !isLast && "pb-4 md:pb-0",
                  labelTone[step.state],
                )}
              >
                {step.label}
                {step.state === "failed" && cancelledReason ? (
                  <span className="block text-xs font-normal text-muted-foreground">{cancelledReason}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
