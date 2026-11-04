"use client";

// Every page but Sign up, Sign in and the landing page (`isOpenPath`) needs
// you signed in (`signedOutPath`): signed out, Home's own address shows the
// landing page and any other page asks you in, carrying where you were going
// (`next`). AUTH_PREPAINT does it before the first paint; this catches what
// happens after: signing out here or in another tab. Renders nothing.

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { isOpenPath, signOut, signedOutPath, useAuth } from "@/lib/account/auth";

// Set while Sign out takes you to Sign in itself, so the gate doesn't race it there.
let signingOut = false;

export function AuthGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, accounts, signedIn } = useAuth();

  React.useEffect(() => {
    if (isOpenPath(pathname)) {
      signingOut = false;
      return;
    }
    if (!hydrated || signedIn || signingOut) return;
    router.replace(signedOutPath(pathname, window.location.search, accounts));
  }, [hydrated, accounts, signedIn, pathname, router]);

  return null;
}

/** Sign out: the account and every piece of work stay in this browser; Sign in says so. */
export function useSignOut(): () => void {
  const router = useRouter();
  return React.useCallback(() => {
    signingOut = true;
    signOut();
    router.replace("/sign-in?signed-out=1");
  }, [router]);
}
