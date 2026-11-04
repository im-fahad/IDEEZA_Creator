"use client";

// Every page but Sign up and Sign in needs you signed in. AUTH_PREPAINT turns
// a signed-out visitor away before the first paint; this catches what happens
// after it: signing out here or in another tab. Renders nothing.

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthPath, signOut, signedOutHome, useAuth } from "@/lib/account/auth";

export function AuthGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, account, signedIn } = useAuth();

  React.useEffect(() => {
    if (!hydrated || signedIn || isAuthPath(pathname)) return;
    router.replace(signedOutHome(account));
  }, [hydrated, account, signedIn, pathname, router]);

  return null;
}

/** Sign out: the account and every piece of work stay in this browser. */
export function useSignOut(): () => void {
  const router = useRouter();
  return React.useCallback(() => {
    signOut();
    router.replace("/sign-in");
  }, [router]);
}
