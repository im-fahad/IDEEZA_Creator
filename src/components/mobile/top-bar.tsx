"use client";

// Figma "Mobile / Top bar" (Shared kit 10600:21, Project Details 10325:20):
// 56 tall, 16 to each side, Back on the left (A02 Icon Button, Secondary, 44,
// arrow-left-02), the title centred (Heading/H6, text/primary) and a right
// slot of 44 px buttons 8 apart (A02 Secondary — ⋯, settings, search). With no
// Back the left slot stays empty, so the title keeps the centre.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft02Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { IconButton } from "@/components/ideeza/icon-button";
import { cn } from "@/lib/utils";

export type TopBarAction = { icon: IconValue; label: string; onClick: () => void };

export function TopBar({
  title,
  back,
  actions = [],
  className,
}: {
  title?: React.ReactNode;
  /** Draws Back: a path to go to, `true` for the previous screen (Home when there is none). */
  back?: string | true;
  actions?: TopBarAction[];
  className?: string;
}) {
  const router = useRouter();
  const goBack = () => {
    if (typeof back === "string") router.push(back);
    else if (window.history.length > 1) router.back();
    else router.push("/m");
  };
  const slot = "flex min-w-[44px] shrink-0 items-center gap-4";
  return (
    <header className={cn("flex h-[56px] shrink-0 items-center justify-between gap-4 px-8", className)}>
      <div className={slot}>
        {back && (
          <IconButton
            hierarchy="secondary"
            size="xl"
            aria-label="Back"
            icon={<Icon icon={ArrowLeft02Icon} size={22} />}
            onClick={goBack}
          />
        )}
      </div>
      {title != null && (
        <h1 className="min-w-0 flex-1 truncate text-center text-lg font-semibold leading-lg text-text-primary">{title}</h1>
      )}
      <div className={cn(slot, "justify-end")}>
        {actions.map((a) => (
          <IconButton
            key={a.label}
            hierarchy="secondary"
            size="xl"
            aria-label={a.label}
            icon={<Icon icon={a.icon} size={22} />}
            onClick={a.onClick}
          />
        ))}
      </div>
    </header>
  );
}

/** The ⋯ every surface's menu opens from (KIT-RB-01…05). */
export const MORE_ICON = MoreHorizontalIcon;
