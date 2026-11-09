"use client";

import * as React from "react";
import { BuyTab } from "@/components/mobile/earn-coin/buy-tab";

// Earn Coin › Buy $IDZ (Figma 229495 / 229392); `?bought=<tx>` opens the purchase's success sheet.
export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <BuyTab />
    </React.Suspense>
  );
}
