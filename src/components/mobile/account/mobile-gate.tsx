"use client";

// Where the phone may go (AU-01 · Splash routes to Home, Welcome, the guest
// Feed or the deep link). While the account and this phone's memory are read,
// Splash shows. Then:
// · the way-in screens are for the signed out (signed in, they go on);
// · Name and handle, the profile steps and the Welcome map need an account;
// · the tabs need an account — except Home, which a guest who chose Explore
//   first may browse; anyone else goes to Welcome, carrying where they were
//   going. The Shared kit is open to all.
// Signed in, the Face ID offer comes once per phone, on the first tab screen.

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/account/auth";
import { ENTRY_PATH, SETUP_PATH, mobileNext, readPhone, updatePhone, updatePhoneAccount, usePhone } from "@/lib/account/phone";
import { Button } from "@/components/ideeza/button";
import { HomeIndicator } from "../home-indicator";
import { Sheet } from "../kit/sheet";
import { StatusBar } from "../status-bar";
import { SplashBody } from "./parts";

/** Where the person goes instead of `pathname`, or null when they may stay. */
function redirectFor(pathname: string, search: string, signedIn: boolean, explored: boolean): string | null {
  if (/^\/m\/kit(\/|$)/.test(pathname)) return null;
  if (ENTRY_PATH.test(pathname)) {
    // Reset is also reached from Settings; the Shared kit's state demos open signed in too.
    if (!signedIn || /^\/m\/(reset|verify)(\/|$)/.test(pathname) || /[?&](demo|error)=/.test(search)) return null;
    return mobileNext(new URLSearchParams(search).get("next"));
  }
  if (SETUP_PATH.test(pathname)) return signedIn ? null : "/m/welcome";
  if (signedIn) return null;
  if (pathname === "/m" && explored) return null;
  const here = pathname + search;
  return pathname === "/m" ? "/m/welcome" : `/m/welcome?next=${encodeURIComponent(here)}`;
}

export function MobileGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, signedIn, account } = useAuth();
  const { hydrated: phoneRead, phone } = usePhone();
  // Both are read from this browser, so `ready` is never true on the server.
  const ready = hydrated && phoneRead;
  const target = ready ? redirectFor(pathname, window.location.search, signedIn, phone.explored) : null;

  React.useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (!ready || target) return <Splash />;

  const tabScreen = !ENTRY_PATH.test(pathname) && !SETUP_PATH.test(pathname) && !/^\/m\/kit/.test(pathname);
  return (
    <>
      {children}
      {signedIn && account && tabScreen && phone.faceIdPending && !phone.faceIdOffered && <FaceIdOffer email={account.email} />}
    </>
  );
}

function Splash() {
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <SplashBody />
      <HomeIndicator />
    </div>
  );
}

/** AU-08 · Face ID offer: once, after the first sign-in on this phone. */
function FaceIdOffer({ email }: { email: string }) {
  const [open, setOpen] = React.useState(true);
  const done = (use: boolean) => {
    if (use) updatePhoneAccount(email, (a) => ({ ...a, faceId: true }));
    updatePhone({ ...readPhone(), faceIdPending: false, faceIdOffered: true });
    setOpen(false);
  };
  return (
    <Sheet
      open={open}
      onClose={() => done(false)}
      title="Sign in with Face ID next time"
      actions={
        <>
          <Button size="xl" className="w-full" onClick={() => done(true)}>
            Use Face ID
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => done(false)}>
            Not now
          </Button>
        </>
      }
    >
      <p className="text-md leading-md text-text-secondary">
        Faster, and no password to type. Change it any time in Sign-in &amp; security.
      </p>
    </Sheet>
  );
}
