import * as React from "react";
import type { Metadata } from "next";
import { CreditPricingPage } from "@/components/admin/credit-pricing/credit-pricing-page";

export const metadata: Metadata = { title: "AI credit pricing · IDEEZA" };

export default function AdminAiCreditsPage() {
  return <CreditPricingPage view="prices" />;
}
