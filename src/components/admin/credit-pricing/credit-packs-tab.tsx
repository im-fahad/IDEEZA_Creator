// The Credit packs tab (owner, 2026-11-11): the live admin's Credit Packs,
// where the admin types only a pack's name and price; its base, bonus and
// total credits are worked out (lib/admin/credit-packs.ts). Like every price,
// a pack change waits for Publish.

import * as React from "react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { ConfirmDialog } from "@/components/ideeza/dialog";
import { formatUsd } from "@/lib/admin/credit-format";
import { newPackId, PACK_MAX, withPopular, type PackDraft, type PackRulesDraft, type PacksInput } from "@/lib/admin/credit-packs";
import type { PricingDoc, PricingPlan } from "@/lib/admin/credit-pricing";
import { Section } from "./fields";
import { PackBonusSection } from "./pack-bonus-section";
import { PackDialog } from "./pack-dialog";
import { PackTable } from "./pack-table";

type Editing = { mode: "add" } | { mode: "edit"; id: string } | null;

export function CreditPacksTab({
  doc,
  plan,
  onPacks,
  onRules,
}: {
  doc: PricingDoc;
  plan: PricingPlan;
  onPacks: (change: (packs: PackDraft[]) => PackDraft[]) => void;
  onRules: (change: (rules: PackRulesDraft) => PackRulesDraft) => void;
}) {
  const [editing, setEditing] = React.useState<Editing>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const packs = doc.draft.packs;
  const editPack = editing?.mode === "edit" ? (packs.find((p) => p.id === editing.id) ?? null) : null;
  const deletePack = deleting ? (packs.find((p) => p.id === deleting) ?? null) : null;
  const full = packs.length >= PACK_MAX;
  const context: PacksInput = {
    draft: packs,
    rules: doc.draft.packRules,
    published: doc.published.packs,
    creditUsd: plan.rates?.creditUsd ?? null,
    maxBonusPct: plan.rates?.maxBonusPct ?? null,
    minPurchase: plan.custom.min,
    customOn: plan.custom.enabled,
  };

  const save = (fields: { name: string; price: string }) => {
    if (editing?.mode === "edit") {
      const { id } = editing;
      onPacks((list) => list.map((p) => (p.id === id ? { ...p, ...fields } : p)));
    } else {
      onPacks((list) => [...list, { id: newPackId(list.map((p) => p.id), Date.now()), ...fields, visible: true, popular: false }]);
    }
    setEditing(null);
  };

  const listPrice = plan.rates ? formatUsd(plan.rates.creditUsd) : null;

  return (
    <div className="flex flex-col gap-12">
      <Section
        title="Credit packs"
        description={`Name a pack and set its price; its credits follow. Base credits are the price at the list price${listPrice ? ` (${listPrice} a credit)` : ""}, rounded down; the bonus is set by the pack's price, below. Makers see the shown packs, cheapest first.`}
        actions={
          <div className="flex flex-col items-end gap-2">
            <Button hierarchy="primary" iconLeading={<Icon icon={Add01Icon} size={20} />} onClick={() => setEditing({ mode: "add" })} disabled={full}>
              Add new pack
            </Button>
            {full ? <span className="text-sm leading-sm text-text-tertiary">{`${PACK_MAX} packs at most`}</span> : null}
          </div>
        }
      >
        {plan.packs.rows.length > 0 ? (
          <PackTable
            plan={plan.packs}
            onPopular={(id) => onPacks((list) => withPopular(list, id))}
            onVisible={(id, visible) => onPacks((list) => list.map((p) => (p.id === id ? { ...p, visible } : p)))}
            onEdit={(id) => setEditing({ mode: "edit", id })}
            onDelete={setDeleting}
          />
        ) : (
          <p className="m-0 rounded-lg bg-bg-subtle p-8 text-md leading-md text-text-secondary">
            No packs yet. Add one, and makers can buy its credits once you publish.
          </p>
        )}
        {plan.packs.removed.length > 0 ? (
          <p className="m-0 text-sm leading-sm text-text-secondary">
            {`Removed when you publish: ${plan.packs.removed.map((p) => p.name).join(", ")}.`}
          </p>
        ) : null}
        {plan.packs.error ? (
          <p role="alert" className="m-0 text-sm leading-sm text-text-error">
            {plan.packs.error}
          </p>
        ) : null}
      </Section>

      <PackBonusSection
        rules={doc.draft.packRules}
        tiers={plan.packs.tiers}
        maxBonusPct={doc.draft.settings.maxBonusPct}
        onChange={onRules}
      />

      <PackDialog
        key={editing === null ? "closed" : editing.mode === "edit" ? `edit-${editing.id}` : "add"}
        open={editing !== null}
        editing={editPack}
        context={context}
        onClose={() => setEditing(null)}
        onSave={save}
      />
      <ConfirmDialog
        open={deletePack !== null}
        title={`Delete the ${deletePack?.name.trim() || "untitled"} pack?`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          const id = deleting;
          setDeleting(null);
          if (id) onPacks((list) => list.filter((p) => p.id !== id));
        }}
        onCancel={() => setDeleting(null)}
      >
        {deletePack && doc.published.packs.some((p) => p.id === deletePack.id)
          ? "Makers stop seeing it once you publish."
          : "It hasn't been published, so makers never saw it."}
      </ConfirmDialog>
    </div>
  );
}
