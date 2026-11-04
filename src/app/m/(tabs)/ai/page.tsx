"use client";

import { AiMagicIcon } from "@hugeicons/core-free-icons";
import { PhasePlaceholder } from "@/components/mobile/phase-placeholder";

// AI tab (Figma Navbar Container › AI): placeholder until phase M2.
export default function Page() {
  return <PhasePlaceholder title="AI" icon={AiMagicIcon} phase="M2" />;
}
