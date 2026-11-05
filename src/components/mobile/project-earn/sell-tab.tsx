"use client";

// Earn › Sell on the phone (Figma 14, 14b–14m, 15–15i; the web's sell.tsx and
// editions.tsx, the owner's selling rules 2026-10-11): What you can sell (the
// three rule cards, Testnet demo once); Whole project · {name} — the Main NFT
// row, then Physical and Virtual (folded into one line until it is minted:
// copies use the project's collection and blockchain), the Main-sale note and
// Mint details; One product at a time (`#copies`) — each product's Physical and
// Virtual rows, or one folded line before the mint. Each row is listed on its
// own, never asking the Main listing.

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ideeza/badge";
import { buttonVariants } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { earnPairOf, editionProductsOf, mainRowStateOf } from "@/lib/manual/earn-view";
import { can } from "@/lib/manual/permissions";
import { phoneProjectHref } from "@/lib/manual/phone-project";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { PROJECT_SCOPE } from "@/lib/market/types";
import { preMintCopiesLine } from "@/lib/market/phone-sell";
import { MAIN_SALE_DETAIL, MAIN_SALE_NOTE, SELL_RULES, SELL_RULES_LEAD } from "@/lib/market/sell-flow";
import { cn } from "@/lib/utils";
import { useEarn } from "./context";
import { CopyRow } from "./sell/copy-row";
import { MainRow, MintDetails } from "./sell/main-row";
import { H2, ROWS_CARD, ROW_LINE, SUB } from "./sell/parts";
import type { CopyScope } from "./sell/sell-copies";

const COPY_KINDS = ["physical", "virtual"] as const;

export function EarnSellTab() {
  return (
    <div className="flex flex-col gap-12">
      <SellRules />
      <WholeProject />
      <EachProduct />
    </div>
  );
}

function SellRules() {
  return (
    <section aria-labelledby="sell-rules" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="sell-rules" className={H2}>
          What you can sell
        </h2>
        <TestnetDemoBadge />
      </div>
      <p className="text-md leading-md text-text-secondary">{SELL_RULES_LEAD}</p>
      <ul className="flex flex-col gap-4">
        {SELL_RULES.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-default bg-bg-surface px-8 py-6">
            <span className="text-md font-semibold leading-md text-text-primary">{r.title}</span>
            <span className={SUB}>{r.line}</span>
            <span className="flex">
              <Badge tone="neutral">{r.where}</Badge>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function useMinted(): boolean {
  const { view } = useEarn();
  return view.summary.status !== "draft" && view.mint.status !== "notMinted";
}

/** A folded row before the mint: what it is and why it waits. */
function WaitingRow({ label, line }: { label: string; line: string }) {
  return (
    <li className={ROW_LINE}>
      <div className="flex flex-col gap-1 px-8 py-6">
        <span className="text-md font-semibold leading-md text-text-primary">{label}</span>
        <span className={SUB}>{line}</span>
      </div>
    </li>
  );
}

function WholeProject() {
  const { project, view, viewer, brief } = useEarn();
  const minted = useMinted();
  const products = view.products.filter((p) => p.dropped === null).map((p) => displayProductName(p.name));
  const scope: CopyScope = { id: PROJECT_SCOPE, name: "Whole project", product: null };
  const pair = earnPairOf(project, view.summary, brief, viewer, view.canCtx);
  const main = mainRowStateOf({
    status: view.summary.status,
    listing: view.listing,
    locked: view.lock !== null,
    canList: [pair.first, pair.second].some((a) => a?.kind === "add-to-marketplace"),
    manage: can(viewer, "facts.seeOwnerOnly") && (view.listing.kind === "live" || view.listing.kind === "paused"),
  });
  // Manage on a Buy-now listing shows the mint's rows itself (14b).
  const shownInManage = main.action === "manage" && view.listing.kind === "live" && view.listing.listing.type === "buyNow";
  return (
    <section aria-labelledby="sell-whole" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 id="sell-whole" className={H2}>{`Whole project · ${project.name}`}</h2>
        {products.length > 0 && <p className={SUB}>{products.join(" + ")}</p>}
      </div>
      <ul className={ROWS_CARD}>
        <MainRow />
        {minted ? (
          COPY_KINDS.map((kind) => <CopyRow key={kind} kind={kind} scope={scope} />)
        ) : (
          <WaitingRow label="Physical and Virtual copies" line={preMintCopiesLine(project.name, "project")} />
        )}
      </ul>
      <p className={SUB}>{`${MAIN_SALE_NOTE} ${MAIN_SALE_DETAIL}`}</p>
      {minted && !shownInManage && <MintDetails />}
    </section>
  );
}

function EachProduct() {
  const { project, view } = useEarn();
  const minted = useMinted();
  const products = editionProductsOf(view.products, view.editions);
  return (
    <section id="copies" aria-labelledby="sell-products" className="flex scroll-mt-8 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 id="sell-products" className={H2}>
          One product at a time
        </h2>
        <p className={SUB}>Products sell copies only, not a Main NFT.</p>
      </div>
      {products.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-md leading-md text-text-secondary">No products yet. Add one to the project to sell its copies.</p>
          <Link href={phoneProjectHref(project.id, "products")} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }))}>
            Open products
          </Link>
        </div>
      ) : !minted ? (
        <ul className={ROWS_CARD}>
          <WaitingRow label="Copies of each product" line={preMintCopiesLine(project.name, "products")} />
        </ul>
      ) : (
        products.map((product) => {
          const name = displayProductName(product.name);
          const scope: CopyScope = { id: product.id, name, product };
          return (
            <section key={product.id} id={`editions-${product.id}`} aria-label={name} className="flex scroll-mt-8 flex-col gap-4">
              <h3 className="break-words text-md font-medium leading-md text-text-primary">{name}</h3>
              <ul className={ROWS_CARD}>
                {COPY_KINDS.map((kind) => (
                  <CopyRow key={kind} kind={kind} scope={scope} />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </section>
  );
}
