"use client";

// The product's ⋯ (Product Details 10c), the owner's only, as a sheet of
// rows: Rename product (10d) and Open chat "…" — where it was built, the one
// place a build is changed (D3) — the web's ProductMenu. The previews and the
// marketplace view have no entry on the Figma's ⋯, so they live here, after
// the web's two, in the web's words: Preview as others see it (31a),
// Preview as a contributor (31b, with the team), and — while one of its
// copies is on sale — See it on the marketplace (10h, as a demo buyer).
// Rename goes through the write gate: a live Buy-now listing asks to pause
// first (the project page's 21), an auction keeps the field off with the
// reason (27a); an empty name says "Give the product a name." (27b).

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight01Icon, BubbleChatIcon, PencilEdit01Icon, Store01Icon, UserMultipleIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { ROLE_WORD } from "@/lib/manual/contributors";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { productRowsOf } from "@/lib/manual/project-read";
import { PROJECT_NAME_MAX, useManualProjects } from "@/lib/manual/projects";
import { MARKET_VIEW, phoneProductPath } from "@/lib/manual/phone-product";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { LIST_ROW } from "../project/parts";
import type { PhoneWriteGate } from "../project/write-gate";
import { useListedCopies } from "./overview";
import { useProduct } from "./use-product";

type Row = { label: string; sub?: string; icon: IconValue; run: () => void };

export function ProductMenu({ open, onClose, onRename }: { open: boolean; onClose: () => void; onRename: () => void }) {
  const { project, product, name, chat, canEdit } = useProduct();
  const router = useRouter();
  const listed = useListedCopies().length > 0;
  const [picking, setPicking] = React.useState(false);
  const team = project.contributors ?? [];
  const base = phoneProductPath(project.id, product.id);
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  const rows: Row[] = [
    ...(canEdit ? [{ label: "Rename product", icon: PencilEdit01Icon, run: onRename }] : []),
    ...(chat ? [{ label: `Open chat “${chat.title}”`, sub: "Where it was built — change it there", icon: BubbleChatIcon, run: () => go(`/m/ai?chat=${encodeURIComponent(chat.id)}`) }] : []),
    { label: "Preview as others see it", sub: "Your page without your editing controls", icon: ViewIcon, run: () => go(`${base}?view=buyer`) },
    ...(team.length ? [{ label: "Preview as a contributor", sub: "The page each role shows", icon: UserMultipleIcon, run: () => setPicking(true) }] : []),
    ...(listed ? [{ label: "See it on the marketplace", sub: "As a demo creator shopping — Testnet demo", icon: Store01Icon, run: () => go(`${base}?view=${MARKET_VIEW}`) }] : []),
  ];
  return (
    <>
      <Sheet open={open && !picking} onClose={onClose} title={name}>
        <ul aria-label="Product actions" className="-mx-8 flex flex-col pb-8">
          {rows.map((r) => (
            <li key={r.label} className={LIST_ROW}>
              <button
                type="button"
                onClick={r.run}
                className="flex min-h-[56px] w-full items-center gap-6 rounded-md px-8 py-4 text-left outline-none hover:bg-bg-subtle focus-visible:bg-bg-subtle"
              >
                <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
                  <Icon icon={r.icon} size={20} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="break-words text-md font-medium leading-md text-text-primary">{r.label}</span>
                  {r.sub && <span className="text-sm leading-sm text-text-secondary">{r.sub}</span>}
                </span>
                <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
                  <Icon icon={ArrowRight01Icon} size={20} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
      <Sheet open={open && picking} onClose={() => setPicking(false)} title="Preview as a contributor">
        <ul role="listbox" aria-label="Preview as" className="-mx-8 flex flex-col pb-8">
          {team.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  setPicking(false);
                  go(`${base}?view=contributor&as=${encodeURIComponent(c.id)}`);
                }}
                className="flex min-h-[44px] w-full items-center justify-between gap-4 rounded-md px-8 text-left text-lg leading-lg text-text-primary outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {c.name}
                <span className="text-sm leading-sm text-text-secondary">
                  {ROLE_WORD[c.role]} · {c.share}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}

const lengthOf = (s: string) => Array.from(s.trim()).length;

/** 10d · Rename product (27a the auction, 27b no name). Mounted each time it opens, so it starts
 *  from the name as stored now. */
export function RenameSheet({ open, onClose, gate }: { open: boolean; onClose: () => void; gate: PhoneWriteGate }) {
  const { project, product } = useProduct();
  const { projects, renameProduct } = useManualProjects();
  const toast = useToast();
  const ids = useFieldIds(["name"] as const);
  const live = projects.find((p) => p.id === project.id) ?? project;
  const current = (productRowsOf(live).find((r) => r.id === product.id)?.name ?? product.name).trim();
  const [name, setName] = React.useState(current);
  const [tried, setTried] = React.useState(false);
  const [refused, setRefused] = React.useState<string | null>(null);

  const value = name.trim();
  const tooLong = lengthOf(name) > PROJECT_NAME_MAX;
  const error = value === "" ? "Give the product a name." : tooLong ? `Keep it to ${PROJECT_NAME_MAX} characters.` : null;
  const blocked = gate.reasonOf("editProduct");
  const reason = refused ?? blocked;
  const shown = tried || tooLong ? error : null;

  const save = (e?: React.FormEvent) => {
    e?.preventDefault();
    setTried(true);
    if (error || blocked) return;
    if (value === current) return onClose();
    setRefused(null);
    const out = gate.guard("editProduct", () => {
      renameProduct(project.id, product.id, value);
      toast({ title: `Renamed to “${displayProductName(value)}”` });
      onClose();
    });
    if (out.kind === "refused") setRefused(out.reason);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Rename product"
      description="The name shows on its card, its page and in the editor."
      actions={
        <>
          <Button size="xl" className="w-full" type="submit" form="m-rename-product" disabled={blocked !== null}>
            Save
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <form id="m-rename-product" onSubmit={save} noValidate className="flex flex-col gap-2 pb-6">
        <Field label="Name" htmlFor={ids.name.id} error={shown} errorId={ids.name.errorId}>
          <TextInput
            id={ids.name.id}
            size="xl"
            value={name}
            placeholder="Name this product"
            onValueChange={setName}
            disabled={blocked !== null}
            autoComplete="off"
            {...errorProps(shown, ids.name.errorId)}
          />
        </Field>
        <span className={cn("text-right text-sm leading-sm", tooLong ? "text-text-error" : "text-text-secondary")}>
          {lengthOf(name)}/{PROJECT_NAME_MAX}
        </span>
        {reason && <p className="text-md leading-md text-text-secondary">{reason}</p>}
      </form>
    </Sheet>
  );
}
