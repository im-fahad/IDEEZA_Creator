"use client";

// Prototype only: the coded Shared kit (Figma "Shared kit · 2026 update",
// 10600:2), one row per pattern, so every sheet, menu, toast and state can be
// opened and checked against its KIT frame. The report sends here are the
// kit's demo (nothing is stored); each phase wires the same parts to its own
// data.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  CopyLinkIcon,
  Search01Icon,
  Share08Icon,
  UserBlock01Icon,
  WifiOff01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { StateCard } from "@/components/ideeza/state-card";
import { ConfirmSheet } from "@/components/mobile/kit/confirm-sheet";
import { ReportSheet, type ReportReason } from "@/components/mobile/kit/report-sheet";
import { ActionSheet, Sheet } from "@/components/mobile/kit/sheet";
import { ListBones } from "@/components/mobile/kit/states";
import { useToast } from "@/components/mobile/kit/toast";
import { Screen } from "@/components/mobile/screen";
import { TopBar } from "@/components/mobile/top-bar";
import { signOut, useAuth } from "@/lib/account/auth";
import { updatePhone } from "@/lib/account/phone";

const PROFILE_REASONS: ReportReason[] = [
  { id: "impersonation", label: "Pretending to be someone else" },
  { id: "copied", label: "Copied someone’s work" },
  { id: "scam", label: "Scam or asks to pay outside IDEEZA" },
  { id: "spam", label: "Spam" },
  { id: "abuse", label: "Harassment or hate" },
  { id: "other", label: "Something else" },
];

const POST_REASONS: ReportReason[] = [
  { id: "copied", label: "Copied someone’s work" },
  { id: "spam", label: "Spam" },
  { id: "abuse", label: "Harassment or hate" },
  { id: "misleading", label: "Misleading" },
  { id: "other", label: "Something else" },
];

const PROJECT = "Smart Plant Watering Kit";
const PERSON = "Philip";

type Open =
  | null
  | "post-menu"
  | "profile-menu"
  | "report-post"
  | "report-profile"
  | "report-fails"
  | "block"
  | "discard"
  | "delete"
  | "cant-yet";

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export default function SharedKitPage() {
  const router = useRouter();
  const toast = useToast();
  const { signedIn } = useAuth();
  const [open, setOpen] = React.useState<Open>(null);
  const close = () => setOpen(null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Couldn’t copy the link.", lead: "error" });
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: PROJECT, url: window.location.href });
      } catch {
        // The share sheet was closed: nothing to say.
      }
    } else {
      void copyLink();
    }
  };

  const block = () => {
    toast({
      title: `You blocked ${PERSON}`,
      action: { label: "Undo", onClick: () => toast({ title: `You unblocked ${PERSON}` }) },
    });
  };

  return (
    <Screen top={<TopBar back title="Shared kit" />} className="px-8 pb-16">
      <div className="flex flex-col gap-12">
        <Group title="Menus (M12)">
          <Row label="Post ⋯" note="KIT-RB-02" onClick={() => setOpen("post-menu")} />
          <Row label="Profile ⋯ with Block" note="KIT-RB-01" onClick={() => setOpen("profile-menu")} />
        </Group>

        <Group title="Confirms (M09)">
          <Row label="Discard changes?" note="KIT-CF-01 · neutral" onClick={() => setOpen("discard")} />
          <Row label="Delete a project" note="KIT-CF-03 · typed" onClick={() => setOpen("delete")} />
          <Row label="Can’t delete yet" note="KIT-CF-04" onClick={() => setOpen("cant-yet")} />
          <Row label={`Block ${PERSON}?`} note="KIT-RB-20 → 21" onClick={() => setOpen("block")} />
        </Group>

        <Group title="Report">
          <Row label="Report profile" note="KIT-RB-10 → 16" onClick={() => setOpen("report-profile")} />
          <Row label="Report post" note="KIT-RB-17" onClick={() => setOpen("report-post")} />
          <Row label="Report that can’t send" note="KIT-RB-14" onClick={() => setOpen("report-fails")} />
        </Group>

        {signedIn && (
          <Group title="Account">
            <Row
              label="Sign out"
              note="Prototype only · AU-50 comes with Profile (M7)"
              onClick={() => {
                void signOut().then(() => {
                  updatePhone({ explored: false });
                  window.location.replace("/m/welcome");
                });
              }}
            />
          </Group>
        )}

        <Group title="Account states with no cause in the demo">
          <Row label="Account suspended" note="AU-05i" onClick={() => router.push("/m/sign-in?demo=suspended")} />
          <Row label="Session expired" note="AU-05j" onClick={() => router.push("/m/sign-in?demo=expired")} />
          <Row label="Couldn’t sign in with Google" note="AU-04c" onClick={() => router.push("/m/welcome?error=google")} />
        </Group>

        <Group title="Toasts (M02)">
          <Row label="Success" note="KIT-TO-01" onClick={() => toast({ title: "Link copied" })} />
          <Row
            label="With Undo"
            note="KIT-TO-02"
            onClick={() => toast({ title: "Comment deleted", action: { label: "Undo", onClick: () => {} } })}
          />
          <Row
            label="Build running"
            note="KIT-TO-03"
            onClick={() =>
              toast({ title: `Building ${PROJECT}`, lead: "none", action: { label: "Open", onClick: () => {} } })
            }
          />
          <Row
            label="Error with Retry"
            note="KIT-TO-04"
            onClick={() =>
              toast({ title: "Couldn’t save.", lead: "error", action: { label: "Retry", onClick: () => {} } })
            }
          />
        </Group>

        <Group title="States">
          <p className="text-sm leading-sm text-text-tertiary">Loading · KIT-SK-01</p>
          <ListBones rows={2} />
          <p className="text-sm leading-sm text-text-tertiary">Empty · KIT-EM-02</p>
          <StateCard
            tone="empty"
            className="w-full"
            icon={<Icon icon={Search01Icon} size={32} />}
            title="Nothing matches these filters"
            body="Try fewer filters, or clear them to see everything."
            action={
              <Button hierarchy="secondary" size="lg">
                Clear filters
              </Button>
            }
          />
          <p className="text-sm leading-sm text-text-tertiary">Error · KIT-ER-02</p>
          <StateCard
            tone="error"
            className="w-full"
            icon={<Icon icon={AlertCircleIcon} size={32} />}
            title="Couldn’t load Messages"
            body="Check your connection, or try again in a moment."
            action={
              <Button hierarchy="secondary" size="lg">
                Try again
              </Button>
            }
          />
          <p className="text-sm leading-sm text-text-tertiary">Offline · KIT-OF-01</p>
          <Banner tone="attention">You’re offline. Showing what was loaded before.</Banner>
          <p className="text-sm leading-sm text-text-tertiary">Offline, nothing cached · KIT-OF-02</p>
          <StateCard
            tone="empty"
            className="w-full"
            icon={<Icon icon={WifiOff01Icon} size={32} />}
            title="You’re offline"
            body="Check your connection and try again."
            action={
              <Button hierarchy="secondary" size="lg">
                Try again
              </Button>
            }
          />
        </Group>
      </div>

      <ActionSheet
        open={open === "post-menu"}
        onClose={close}
        title={PROJECT}
        items={[
          { label: "Copy link", icon: CopyLinkIcon, onSelect: copyLink },
          { label: "Share via…", icon: Share08Icon, onSelect: shareLink },
          { label: "Report post", icon: AlertCircleIcon, onSelect: () => setOpen("report-post") },
        ]}
      />
      <ActionSheet
        open={open === "profile-menu"}
        onClose={close}
        title="Philip Michel"
        items={[
          { label: "Copy profile link", icon: CopyLinkIcon, onSelect: copyLink },
          { label: "Report profile", icon: AlertCircleIcon, onSelect: () => setOpen("report-profile") },
          { label: `Block ${PERSON}`, icon: UserBlock01Icon, destructive: true, onSelect: () => setOpen("block") },
        ]}
      />

      <ConfirmSheet
        open={open === "discard"}
        onClose={close}
        title="Discard changes?"
        body="Your edits to this project’s description are lost."
        verb="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => toast({ title: "Changes discarded" })}
      />
      <ConfirmSheet
        open={open === "delete"}
        onClose={close}
        title={`Delete “${PROJECT}”?`}
        body="Its files, links and prices are deleted. This can’t be undone."
        verb="Delete project"
        destructive
        typed={PROJECT}
        typedLabel="Type the project name to confirm"
        onConfirm={() => toast({ title: "Project deleted" })}
      />
      <ConfirmSheet
        open={open === "block"}
        onClose={close}
        title={`Block ${PERSON}?`}
        body={`${PERSON} won’t be able to message you, and their comments on your shared projects are held. They won’t be told. You can unblock them in Settings › Privacy & safety.`}
        verb="Block"
        destructive
        onConfirm={block}
      />
      <Sheet
        open={open === "cant-yet"}
        onClose={close}
        title="You can’t delete this yet"
        actions={
          <>
            <Button size="xl" className="w-full" onClick={() => router.push("/m/earn")}>
              Go to Earn › Sell
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={close}>
              Cancel
            </Button>
          </>
        }
      >
        <Banner tone="attention" title="It’s listed for sale">
          Remove the listing first, then delete.
        </Banner>
      </Sheet>

      <ReportSheet
        open={open === "report-profile"}
        onClose={close}
        title="Report Philip’s profile"
        description={`${PERSON} won’t know who reported.`}
        reasons={PROFILE_REASONS}
        blockName={PERSON}
        onSend={() => wait(800)}
      />
      <ReportSheet
        open={open === "report-post"}
        onClose={close}
        title="Report post"
        description="The maker won’t know who reported."
        reasons={POST_REASONS}
        onSend={() => wait(800)}
      />
      <ReportSheet
        open={open === "report-fails"}
        onClose={close}
        title="Report Philip’s profile"
        description={`${PERSON} won’t know who reported.`}
        reasons={PROFILE_REASONS}
        blockName={PERSON}
        onSend={async () => {
          await wait(800);
          throw new Error("demo: the send fails");
        }}
      />
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-md font-medium leading-md text-text-secondary">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Row({ label, note, onClick }: { label: string; note: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface px-8 py-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-lg leading-lg text-text-primary">{label}</span>
        <span className="text-sm leading-sm text-text-tertiary">{note}</span>
      </span>
      <span className="text-[color:var(--color-icon-secondary)]">
        <Icon icon={ArrowRight01Icon} size={20} />
      </span>
    </button>
  );
}
