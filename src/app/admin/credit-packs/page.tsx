import * as React from "react";
import type { Metadata } from "next";
import { CreditPricingPage } from "@/components/admin/credit-pricing/credit-pricing-page";

export const metadata: Metadata = { title: "Credit packs · IDEEZA" };

// The Credit packs tab of AI credit pricing, at its own address so the
// sidebar, a link and the sign-in redirect (which keeps the path, not a #hash)
// all reach it.
export default function AdminCreditPacksPage() {
  return <CreditPricingPage view="packs" />;
}
