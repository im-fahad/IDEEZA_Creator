"use client";

// Earn › Sell · Business plan · Money (Project Details · 2026 update 14–17).
// Any other segment is not found.
import { use } from "react";
import { notFound } from "next/navigation";
import { EarnScreen } from "@/components/mobile/project-earn/earn-screen";
import { parsePhoneEarnSection } from "@/lib/manual/phone-earn";

export default function Page({ params }: { params: Promise<{ id: string; section: string }> }) {
  const { id, section } = use(params);
  const tab = parsePhoneEarnSection(section);
  if (!tab) notFound();
  return <EarnScreen id={decodeURIComponent(id)} section={tab} />;
}
