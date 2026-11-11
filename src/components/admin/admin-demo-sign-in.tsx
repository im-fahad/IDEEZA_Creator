"use client";

// The admin prototype's way in (owner 2026-11-11: "if browse /admin then if
// not logged in make a demo login. so this prototype reviewer no need to get
// signup/sign hasel for now"). The sign-in gates leave /admin alone
// (auth.ts `isAdminPath`); here a visitor who arrives signed out is signed in
// as the demo admin (`signInDemoAdmin`, made the first time). Signing in
// brings that account's own work back (work-vault.ts), so the page reloads,
// as every sign-in does, and the admin's pages show only to someone who was
// signed in when the page loaded: they never read a store the sign-in moves.
// Signing out in another tab later leaves this page as it is.

import * as React from "react";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Spinner } from "@/components/ideeza/spinner";
import { StateCard } from "@/components/ideeza/state-card";
import { signInDemoAdmin, useAuth } from "@/lib/account/auth";

// One sign-in a page load, however often the effect runs (React runs it twice in development):
// a second one would find the first's account coming in and drop the work it brought back.
let demoSignIn: Promise<"in" | "new" | "refused"> | null = null;

export function AdminDemoSignIn({ children }: { children: React.ReactNode }) {
  const { hydrated, signedIn } = useAuth();
  // Whether someone was signed in when the browser's accounts were first read; null before that.
  const [arrived, setArrived] = React.useState<boolean | null>(null);
  const [refused, setRefused] = React.useState(false);
  if (hydrated && arrived === null) setArrived(signedIn);

  React.useEffect(() => {
    if (arrived !== false) return;
    let live = true;
    demoSignIn ??= signInDemoAdmin(Date.now());
    void demoSignIn.then((result) => {
      if (!live) return;
      if (result === "refused") setRefused(true);
      else window.location.reload();
    });
    return () => {
      live = false;
    };
  }, [arrived]);

  if (arrived === null) return null;
  if (arrived) return <>{children}</>;
  return (
    <div className="flex min-h-full items-center justify-center p-12">
      {refused ? (
        <div role="alert">
          <StateCard
            tone="error"
            icon={<Icon icon={Alert02Icon} size={32} />}
            title="The demo couldn't sign you in"
            body="This browser didn't save the demo admin's account. Its storage may be full or blocked."
          />
        </div>
      ) : (
        <p role="status" className="m-0 inline-flex items-center gap-4 text-md leading-md text-text-secondary">
          <Spinner size={20} />
          Signing you in as the demo admin…
        </p>
      )}
    </div>
  );
}
