"use client";

// 02 · Products tab and Add a product (02b–02h). The web's Products tab as
// one list: the count and pieces line and the Build check, Search + Sort once
// a project has 6 or more products, then "Add a product" first (the web's
// first tile) and every product as a compact row (M5).
//
// Add a product is the web's dialog as one sheet with three steps:
// · Choose (02b): Build with AI · Build manually;
// · Build with AI (02c, 02e): the idea, Enhance, the credits and the cost, ✦
//   starts the chat that adds it (`createChat(prompt, { addTo })`), which
//   opens on the AI tab — the web opens the chat too; Back;
// · Build manually (02d, 02g, 02h): the name ("Give the product a name."),
//   then `addProduct` behind the edit gate. The editors need a computer
//   (D3), so the phone adds it here and says so with a toast.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Add01Icon,
  AiMagicIcon,
  ArrowRight01Icon,
  MagicWand01Icon,
  PencilEdit01Icon,
  SortingDownIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { SearchInput } from "@/components/ideeza/search-input";
import { TextInput } from "@/components/ideeza/text-input";
import { CONCEPT_COST, useCredits } from "@/lib/create/credits";
import { useCreateHistory } from "@/lib/create/history";
import { can } from "@/lib/manual/permissions";
import { PROJECT_NAME_MAX, useManualProjects } from "@/lib/manual/projects";
import { PRODUCT_SORTS, PRODUCT_TOOLS_FROM, filterProductRows, type ProductSort } from "@/lib/manual/phone-project";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { useProject } from "./context";
import { BuildCheckLine, useProductRows } from "./product-rows";
import { Chevron, LIST_ROW, ListCard, ProductRow, SubLine } from "./parts";

export function ProductsTab() {
  const { project, view, viewer, gate, open } = useProject();
  const { rows, line, headline } = useProductRows();
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<ProductSort>("project");
  const [sorting, setSorting] = React.useState(false);
  const [refused, setRefused] = React.useState<string | null>(null);
  const tools = rows.length >= PRODUCT_TOOLS_FROM;
  const shown = tools ? filterProductRows(rows, query, sort) : rows;
  const canAdd = can(viewer, "product.add", view.canCtx);
  const reason = canAdd ? gate.reasonOf("addProduct") : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SubLine>{line}</SubLine>
        <BuildCheckLine headline={headline} />
      </div>
      {tools && (
        <div className="flex items-center gap-4">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search products"
            aria-label="Search products"
            enterKeyHint="search"
            containerClassName="min-h-[44px] min-w-0 flex-1"
          />
          <Button
            hierarchy="secondary"
            size="xl"
            iconLeading={<Icon icon={SortingDownIcon} size={20} />}
            aria-haspopup="dialog"
            onClick={() => setSorting(true)}
          >
            Sort
          </Button>
        </div>
      )}
      <ListCard label="Products">
        {canAdd && !query && (
          <li className={LIST_ROW}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-disabled={reason ? true : undefined}
              onClick={() => {
                if (reason) return setRefused(reason);
                open({ kind: "add-product" });
              }}
              className="flex w-full items-center gap-6 p-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle"
            >
              <span aria-hidden className="flex size-[56px] shrink-0 items-center justify-center rounded-md bg-bg-surface-raised text-[color:var(--color-icon-default)]">
                <Icon icon={Add01Icon} size={24} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-md font-semibold leading-md text-text-primary">Add a product</span>
                <span className="text-sm leading-sm text-text-secondary">Build it with AI or by hand. It joins {project.name}.</span>
                {refused && <span className="text-sm font-medium leading-sm text-text-primary">{refused}</span>}
              </span>
              <Chevron />
            </button>
          </li>
        )}
        {shown.map((r) => (
          <ProductRow key={r.id} href={r.href} thumb={r.thumb} name={r.name} stage={r.stage} meta={r.meta} facts={r.facts} />
        ))}
        {tools && shown.length === 0 && (
          <li className="p-6 text-md leading-md text-text-secondary">No product matches “{query.trim()}”.</li>
        )}
      </ListCard>
      <Sheet open={sorting} onClose={() => setSorting(false)} title="Sort">
        <ul role="listbox" aria-label="Sort" className="-mx-8 flex flex-col">
          {PRODUCT_SORTS.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === sort}
                onClick={() => {
                  setSort(o.value);
                  setSorting(false);
                }}
                className={cn(
                  "flex h-[40px] w-full items-center justify-between rounded-md px-8 text-left text-lg leading-lg outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus",
                  o.value === sort ? "font-medium text-text-brand" : "text-text-primary",
                )}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

// ─────────────────────────── Add a product (02b–02h) ───────────────────────────

type Step = "choose" | "ai" | "manual";

const OPTION =
  "flex w-full items-start gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border p-8 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus";

export function AddProductSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { project } = useProject();
  const [step, setStep] = React.useState<Step>("choose");
  const close = () => {
    setStep("choose");
    onClose();
  };
  const title = step === "ai" ? "Build with AI" : step === "manual" ? "Build manually" : `Add a product to ${project.name}`;
  const description = step === "choose" ? "Pick how you want to make it." : `It's added to ${project.name}.`;
  return (
    <Sheet
      open={open}
      onClose={close}
      title={title}
      description={description}
      actions={step === "choose" ? undefined : <StepActions step={step} onBack={() => setStep("choose")} onDone={close} />}
    >
      {step === "choose" && (
        <div className="flex flex-col gap-6 pb-8">
          <button type="button" onClick={() => setStep("ai")} className={OPTION}>
            <span aria-hidden className="inline-flex size-[36px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-[color:var(--color-icon-brand)]">
              <Icon icon={AiMagicIcon} size={18} />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-md font-semibold leading-md text-text-primary">Build with AI</span>
              <span className="text-md leading-md text-text-secondary">Describe it, and AI draws concepts and builds the files.</span>
            </span>
          </button>
          <button type="button" onClick={() => setStep("manual")} className={OPTION}>
            <span aria-hidden className="inline-flex size-[36px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-[color:var(--color-icon-brand)]">
              <Icon icon={PencilEdit01Icon} size={18} />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-md font-semibold leading-md text-text-primary">Build manually</span>
              <span className="text-md leading-md text-text-secondary">Start an empty product and design it yourself in the editors.</span>
            </span>
          </button>
        </div>
      )}
      {step === "ai" && <BuildWithAi onStarted={close} />}
      {step === "manual" && <BuildManually onAdded={close} />}
    </Sheet>
  );
}

/** The sheet's footer per step: Back alone for Build with AI (✦ in the prompt box starts it, 02c);
 *  Create product + Back for Build manually (02d). */
function StepActions({ step, onBack, onDone }: { step: Step; onBack: () => void; onDone: () => void }) {
  void onDone;
  return (
    <>
      {step === "manual" && (
        <Button size="xl" className="w-full" type="submit" form="m-add-manual">
          Create product
        </Button>
      )}
      <Button hierarchy="secondary" size="xl" className="w-full" onClick={onBack}>
        Back
      </Button>
    </>
  );
}

const PROMPT_MAX = 2000;

function BuildWithAi({ onStarted }: { onStarted: () => void }) {
  const { project } = useProject();
  const router = useRouter();
  const { createChat } = useCreateHistory();
  const { hydrated, balance } = useCredits();
  const [prompt, setPrompt] = React.useState("");
  const [tried, setTried] = React.useState(false);
  const [refining, setRefining] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const areaRef = React.useRef<HTMLTextAreaElement>(null);
  const empty = prompt.trim() === "";
  const canRender = !hydrated || balance >= CONCEPT_COST;
  const error = tried && empty ? "Describe the product first." : null;

  const refine = async () => {
    const text = prompt.trim();
    if (!text || refining) return;
    setRefining(true);
    try {
      const res = await fetch("/api/refine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: text }) });
      const data = (await res.json()) as { refined?: string };
      if (data.refined?.trim()) setPrompt(data.refined.trim().slice(0, PROMPT_MAX));
    } catch {
      // The idea stays as it was typed.
    } finally {
      setRefining(false);
    }
  };

  const start = () => {
    if (starting) return;
    if (empty) {
      setTried(true);
      areaRef.current?.focus();
      return;
    }
    if (!canRender) return;
    setStarting(true);
    const chat = createChat(prompt.trim(), { addTo: project.id });
    onStarted();
    router.push(`/m/ai?chat=${encodeURIComponent(chat.id)}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "flex flex-col gap-4 rounded-xl border-[length:var(--border-width-1-5)] border-solid bg-[var(--color-input-bg)] px-8 pb-4 pt-6 focus-within:border-[var(--color-input-border-focus)]",
          error ? "border-[var(--color-input-border-error)]" : "border-[var(--color-input-border)]",
        )}
      >
        <textarea
          ref={areaRef}
          value={prompt}
          maxLength={PROMPT_MAX}
          rows={3}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your device"
          aria-label="Describe your device"
          aria-invalid={error ? true : undefined}
          className="w-full resize-none bg-transparent text-lg leading-lg text-[color:var(--color-input-text)] outline-none placeholder:text-[color:var(--color-input-placeholder)]"
        />
        <div className="flex items-center justify-end gap-4">
          <Button
            hierarchy="ghost"
            size="lg"
            disabled={empty || refining}
            iconLeading={<Icon icon={MagicWand01Icon} size={16} />}
            onClick={refine}
          >
            {refining ? "Enhancing…" : "Enhance"}
          </Button>
          <Button
            hierarchy="tonal"
            size="xl"
            iconOnly
            aria-label={starting ? "Starting…" : "Start"}
            disabled={starting || !canRender}
            onClick={start}
          >
            <Icon icon={SparklesIcon} size={20} />
          </Button>
        </div>
      </div>
      {error && <p className="text-sm leading-sm text-text-error">{error}</p>}
      <div className="flex items-center justify-between gap-4 text-sm leading-sm">
        <span className="font-medium text-text-brand">{hydrated ? `${balance} credits` : "—"}</span>
        <span className="text-text-secondary">Generation Cost: {CONCEPT_COST} Credit</span>
      </div>
      {!canRender && (
        <p className="text-md leading-md text-text-error">
          You need {CONCEPT_COST} credit to start. You have {balance}.
        </p>
      )}
    </div>
  );
}

function BuildManually({ onAdded }: { onAdded: () => void }) {
  const { project, gate } = useProject();
  const { addProduct } = useManualProjects();
  const toast = useToast();
  const ids = useFieldIds(["name"] as const);
  const [name, setName] = React.useState("");
  const [tried, setTried] = React.useState(false);
  const [refused, setRefused] = React.useState<string | null>(null);
  const clean = name.trim();
  const fieldError =
    clean === "" ? "Give the product a name." : Array.from(clean).length > PROJECT_NAME_MAX ? `Keep it to ${PROJECT_NAME_MAX} characters.` : null;
  const shown = tried ? fieldError : null;
  const blocked = gate.reasonOf("addProduct") ?? refused;

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (fieldError) return setTried(true);
    const out = gate.guard("addProduct", () => {
      const rowId = addProduct(project.id, clean);
      if (!rowId) return setRefused("This browser's storage is full — the product wasn't added.");
      onAdded();
      toast({ title: `${clean} added to ${project.name}` });
    });
    setRefused(out.kind === "refused" ? out.reason : null);
  };

  return (
    <form id="m-add-manual" onSubmit={create} noValidate className="flex flex-col gap-6 pb-4">
      <Field label="Product name" htmlFor={ids.name.id} error={shown} errorId={ids.name.errorId}>
        <TextInput
          id={ids.name.id}
          size="xl"
          value={name}
          onValueChange={(v) => {
            setName(v);
            setTried(false);
          }}
          autoComplete="off"
          enterKeyHint="done"
          {...errorProps(shown, ids.name.errorId)}
        />
      </Field>
      <p className="text-sm leading-sm text-text-secondary">You can describe it later on its own page.</p>
      <p className="flex items-start gap-2 text-md leading-md text-text-secondary">
        <span aria-hidden className="mt-1 text-[color:var(--color-icon-secondary)]">
          <Icon icon={ArrowRight01Icon} size={14} />
        </span>
        The editors open on a computer. On your phone the product is added to this project.
      </p>
      {blocked && (
        <p role="alert" className="text-md leading-md text-text-error">
          {blocked}
        </p>
      )}
    </form>
  );
}
