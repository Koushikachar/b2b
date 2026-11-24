"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

/** Icon button that copies `value`; `label` names it for screen readers. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? "Copied" : `Copy ${label}`}
      className="shrink-0 text-muted-foreground hover:text-foreground"
    >
      <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} strokeWidth={2} />
    </Button>
  );
}
