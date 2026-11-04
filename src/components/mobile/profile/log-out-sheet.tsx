"use client";

// Log Out from the Profile hub: the neutral sign-out confirm in AU-50's words
// (Account · 2026 update), standing in until Settings' own sign-out sheet
// merges — one component, so it can be swapped. Signing out parks this
// account's work, sends the phone back to Welcome and says "Signed out"
// there (AU-50c).

import * as React from "react";
import { signOut } from "@/lib/account/auth";
import { updatePhone } from "@/lib/account/phone";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { toastAfterReload, useToast } from "../kit/toast";

export function LogOutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  return (
    <ConfirmSheet
      open={open}
      onClose={onClose}
      title="Sign out of IDEEZA?"
      body="Your projects stay in your account. Builds keep running."
      verb="Sign out"
      onConfirm={async () => {
        if (!(await signOut()).ok) {
          toast({ title: "Couldn’t sign out. This phone’s storage is full or blocked.", lead: "error" });
          return;
        }
        updatePhone({ explored: false });
        toastAfterReload("Signed out");
        window.location.replace("/m/welcome");
      }}
    />
  );
}
