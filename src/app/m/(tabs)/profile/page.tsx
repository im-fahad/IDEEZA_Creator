"use client";

import { UserCircleIcon } from "@hugeicons/core-free-icons";
import { PhasePlaceholder } from "@/components/mobile/phase-placeholder";

// Profile tab (Figma Navbar Container › Profile): placeholder until phase M7.
export default function Page() {
  return <PhasePlaceholder title="Profile" icon={UserCircleIcon} phase="M7" />;
}
