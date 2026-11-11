import * as React from "react";
import type { Metadata } from "next";
import { MakerPreviewPage } from "@/components/admin/maker-preview/maker-preview-page";

export const metadata: Metadata = { title: "Maker preview · IDEEZA" };

// How makers see the admin's AI credit prices: packs, build quality and services.
export default function AdminMakerPreviewPage() {
  return <MakerPreviewPage />;
}
