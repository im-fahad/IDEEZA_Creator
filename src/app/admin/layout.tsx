import * as React from "react";
import type { Metadata } from "next";
import { AdminDemoSignIn } from "@/components/admin/admin-demo-sign-in";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const metadata: Metadata = { title: "Admin · IDEEZA" };

// The admin pages (prototype, owner 2026-11-10): outside the app shell, with
// their own sidebar and <main>, as Sign up and Sign in have theirs. Open
// without Sign up or Sign in (owner 2026-11-11, so a reviewer goes straight
// in): the gates leave /admin alone and a signed-out visitor is signed in as
// the demo admin (`AdminDemoSignIn`). There are no admin roles in the demo, so
// any signed-in account can open them too.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-bg-page font-sans text-text-primary md:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-max focus:rounded-md focus:bg-bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-text-on-brand focus:outline-none"
      >
        Skip to main content
      </a>
      <AdminSidebar />
      {/* `relative`: the tables' screen-reader labels are `position: absolute`
          (sr-only). Without a positioned <main> they are placed against the
          page, not this scroll box, and stretch the document to the tables'
          full height: a second scrollbar on the window. */}
      <main id="main-content" tabIndex={-1} className="relative min-h-0 flex-1 overflow-y-auto outline-none">
        <AdminDemoSignIn>{children}</AdminDemoSignIn>
      </main>
    </div>
  );
}
