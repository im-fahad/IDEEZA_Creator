// Add or edit a credit pack: the admin types its name and price, and its base,
// bonus and total credits show as they type, worked out exactly as the table
// and Publish work them out (planPacks). A pack below the minimum purchase
// can't be saved while it's shown, as on the live admin (PR-8937).

import * as React from "react";
import { Button } from "@/components/ideeza/button";
import { ModalFrame } from "@/components/ideeza/dialog";
import { TextInput } from "@/components/ideeza/text-input";
import { formatCredits, formatPercent, formatUsd } from "@/lib/admin/credit-format";
import { PACK_NAME_MAX, planPacks, type PackDraft, type PackRow, type PacksInput } from "@/lib/admin/credit-packs";
import { AmountField } from "./fields";

const NEW_ID = "__new__";

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <dt className="text-md leading-md text-text-secondary">{label}</dt>
      <dd className={strong ? "m-0 text-lg font-semibold leading-lg text-text-primary" : "m-0 text-md leading-md text-text-primary"}>{value}</dd>
    </div>
  );
}

function Preview({ row, why }: { row: PackRow | null; why: string | null }) {
  if (!row || row.base === null || row.bonus === null || row.total === null) {
    return <p className="m-0 text-sm leading-sm text-text-tertiary">{why ?? "Enter a price to see the pack's credits."}</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <dl className="m-0 flex flex-col gap-3">
        <Line label="Base credits" value={row.base.toLocaleString("en-US")} />
        <Line label={`Bonus (${formatPercent(row.bonusPct ?? 0)})`} value={`+${row.bonus.toLocaleString("en-US")}`} />
        <Line label="Total" value={formatCredits(row.total)} strong />
      </dl>
      {row.perCreditUsd !== null ? (
        <p className="m-0 text-sm leading-sm text-text-secondary">
          {`${formatUsd(row.perCreditUsd)} a credit${row.offListPct !== null && row.offListPct >= 0.05 ? `, ${formatPercent(row.offListPct)} under the list price` : ", the list price"}.`}
        </p>
      ) : null}
      {row.minError ? (
        <p role="alert" className="m-0 text-sm leading-sm text-text-error">
          {row.minError}
        </p>
      ) : null}
    </div>
  );
}

export function PackDialog({
  open,
  editing,
  context,
  onClose,
  onSave,
}: {
  open: boolean;
  /** The pack being edited; null adds one. */
  editing: PackDraft | null;
  /** Everything else the pack's credits depend on: the other packs, the rules, the credit's price. */
  context: PacksInput;
  onClose: () => void;
  onSave: (fields: { name: string; price: string }) => void;
}) {
  // The caller keys the dialog by the pack it opens on, so each opening starts from that pack.
  const [name, setName] = React.useState(editing?.name ?? "");
  const [price, setPrice] = React.useState(editing?.price ?? "");
  const [tried, setTried] = React.useState(false);
  const nameRef = React.useRef<HTMLInputElement | null>(null);
  const nameId = React.useId();

  const id = editing?.id ?? NEW_ID;
  const draft = editing
    ? context.draft.map((p) => (p.id === id ? { ...p, name, price } : p))
    : [...context.draft, { id, name, price, visible: true, popular: false }];
  const plan = planPacks({ ...context, draft });
  const row = plan.rows.find((r) => r.id === id) ?? null;
  const tiersWrong = plan.tiers.some((t) => t.fromError || t.pctError);
  const why =
    context.creditUsd === null
      ? "Fix the credit's price on the Prices tab to see the pack's credits."
      : tiersWrong
        ? "Fix the bonus tiers below the packs to see the pack's credits."
        : null;
  const nameError = row && (tried || name.trim() !== "") ? row.nameError : null;
  const priceError = row && (tried || price.trim() !== "") ? row.priceError : null;

  const save = (e?: React.FormEvent) => {
    e?.preventDefault();
    setTried(true);
    if (!row || row.nameError || row.priceError || row.minError) return;
    onSave({ name: name.trim(), price: price.trim() });
  };

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      size="sm"
      title={editing ? `Edit the ${editing.name.trim() || "new"} pack` : "Add a credit pack"}
      description="Name the pack and set its price. Its base, bonus and total credits follow."
      initialFocus={nameRef}
      footer={
        <>
          <Button hierarchy="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button hierarchy="primary" type="submit" form={`${nameId}-form`}>
            {editing ? "Save pack" : "Add pack"}
          </Button>
        </>
      }
    >
      <form id={`${nameId}-form`} onSubmit={save} noValidate className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <label htmlFor={nameId} className="text-sm font-medium leading-sm text-text-primary">
            Pack name
          </label>
          <TextInput
            ref={nameRef}
            id={nameId}
            value={name}
            onValueChange={setName}
            invalid={!!nameError}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? `${nameId}-error` : undefined}
            maxLength={PACK_NAME_MAX + 8}
            autoComplete="off"
            placeholder="Starter"
          />
          {nameError ? (
            <p id={`${nameId}-error`} className="m-0 text-sm leading-sm text-text-error">
              {nameError}
            </p>
          ) : null}
        </div>
        <AmountField
          label="Pack price"
          prefix="$"
          placeholder="9.99"
          value={price}
          onValueChange={setPrice}
          error={priceError}
          hint="In US dollars, what the maker pays."
          inputClassName="max-w-[200px]"
        />
        <div className="rounded-lg bg-bg-subtle p-8">
          <Preview row={row} why={why} />
        </div>
      </form>
    </ModalFrame>
  );
}
