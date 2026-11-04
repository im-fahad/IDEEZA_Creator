"use client";

import { CoinsDollarIcon } from "@hugeicons/core-free-icons";
import { PhasePlaceholder } from "@/components/mobile/phase-placeholder";

// Earn Coin tab (Figma Navbar Container › Earn Coin): placeholder until phase M8.
export default function Page() {
  return <PhasePlaceholder title="Earn Coin" icon={CoinsDollarIcon} phase="M8" />;
}
