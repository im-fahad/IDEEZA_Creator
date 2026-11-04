"use client";

// One piece of the product, full screen and view only (Product Details 10g,
// 10i–10m, 10o, 10ya, 33a–33c; D3: nothing is edited on a phone):
// `/m/projects/<id>/products/<productId>/build/<piece>`. Under the bar,
// "{product} · version {n} · view only on a phone" (a buyer without a copy:
// "files come with a copy"); then the piece in its state —
// · ready: the web review's own previews (the board and the wiring map, with
//   pinch to zoom), the firmware read-only with line numbers (it scrolls
//   sideways), the parts list with its Summary, the 3D Module and Assembly
//   in the phone's 3D viewer;
// · failed (10o): "This piece failed in this build", Rebuild this piece (the
//   review's free retry) and Open chat;
// · waiting (33b) and still being built (33c) with its progress;
// · not built (33a): what it adds, its price and time, Add pieces (D2);
// then "What this covers" (`coversFor`, the web's words), and the piece's
// file in a sticky footer — or, for a buyer, "Buy a copy to download".
// A Feed sample opens its parts list and says it has no 3D file.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download04Icon, SquareLock02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { coversFor, PcbPreview, WiringPreview } from "@/components/create/deliverable-previews";
import { fileFor, save } from "@/components/projects/product/product-deliverables";
import { bomFor, firmwareFor, isSampleModel, netsFor } from "@/lib/create/build-artifacts";
import { ITEM_LABELS, useCreateHistory, type BuildItemKind, type BuildProduct } from "@/lib/create/history";
import { PIECES, isLeftOut } from "@/lib/create/pieces";
import { sampleProjectOf } from "@/lib/manual/phone-project";
import { copiesFromOf, notBuiltCostLine, parsePiece, phoneProductPath } from "@/lib/manual/phone-product";
import { trackCardOf } from "@/lib/market/editions";
import { formatAmount } from "@/lib/wallet/money";
import type { PostProduct } from "@/lib/innovations/types";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { LIST_CARD, LIST_ROW } from "../project/parts";
import { AddPiecesSheet } from "./build-tab";
import { ModelPiece } from "./model-view";
import { useListedCopies } from "./overview";
import { ProductLoading, ProductMissing, ProjectMissing } from "./states";
import { ProductProvider, useProduct, useProductData } from "./use-product";

export function PieceScreen({ id, productId, piece }: { id: string; productId: string; piece: string }) {
  const kind = parsePiece(piece);
  const data = useProductData(id, productId);
  if (data.state === "loading") return <ProductLoading />;
  if (data.state === "missing") {
    const sample = data.market ? null : sampleProjectOf(id);
    const sp = sample?.products.find((p) => p.id === productId) ?? null;
    if (sample && sp && kind) return <SamplePiece projectId={id} product={sp} kind={kind} />;
    return <ProjectMissing />;
  }
  if (data.state === "no-product") return <ProductMissing projectName={data.projectName} back={`/m/projects/${encodeURIComponent(data.projectId)}?tab=products`} />;
  return (
    <ProductProvider value={data.ctx}>
      <PieceView kind={kind} />
    </ProductProvider>
  );
}

function PieceView({ kind }: { kind: BuildItemKind | null }) {
  const { job, bp, name, version, downloads, mode, path } = useProduct();
  const back = path("", { tab: "build" });
  const item = kind && bp ? (bp.items.find((i) => i.kind === kind) ?? null) : null;
  const shown = item && (item.status !== "skipped" || isLeftOut(item)) ? item : null;
  // A buyer without a copy never reads the firmware (O12): its row isn't on the Build list either.
  const hiddenCode = kind === "code" && !downloads;
  if (!kind || !job || !bp || !shown || hiddenCode) {
    return (
      <Screen top={<TopBar back={back} title={kind ? ITEM_LABELS[kind] : "Piece"} />} className="px-8 pb-8">
        <p className="pt-8 text-lg font-semibold leading-lg text-text-primary">This piece isn’t in this build.</p>
      </Screen>
    );
  }
  const state = isLeftOut(shown) ? "notBuilt" : shown.status;
  const ready = state === "ready";
  const sub = `${name} · version ${version?.shown ?? 1} · ${downloads ? "view only on a phone" : "files come with a copy"}`;
  return (
    <Screen top={<TopBar back={back} title={ITEM_LABELS[kind]} />} footer={<PieceFooter kind={kind} bp={bp} ready={ready} />}>
      <div className="flex flex-col gap-8 px-8 pb-12">
        <p className="text-sm leading-sm text-text-secondary">{sub}</p>
        {state === "notBuilt" ? (
          <NotBuilt kind={kind} bp={bp} />
        ) : state === "failed" ? (
          <Failed kind={kind} />
        ) : state === "building" ? (
          <div className="flex flex-col gap-4">
            <Banner tone="info" title="Still being built">{`${Math.round(shown.progress)}% done. You can leave this screen.`}</Banner>
            <ProgressBar value={shown.progress} label={`${ITEM_LABELS[kind]} build`} />
          </div>
        ) : state === "pending" ? (
          <Banner tone="info" title="Waiting to be built">
            {waitingLine(kind, bp)}
          </Banner>
        ) : (
          <ReadyPiece kind={kind} bp={bp} />
        )}
        {mode !== "owner" && !downloads && !ready ? null : <Covers kind={kind} bp={bp} />}
      </div>
    </Screen>
  );
}

/** What a waiting piece waits for: the pieces it is made from that aren't ready yet. */
function waitingLine(kind: BuildItemKind, bp: BuildProduct): string {
  const before = PIECES[kind].needs.filter((n) => n !== "parts" && bp.items.some((i) => i.kind === n && i.status !== "ready" && i.status !== "skipped"));
  return before.length ? `It starts once the ${before.map((k) => PIECES[k].name).join(" and ")} ${before.length === 1 ? "is" : "are"} done.` : "It starts once the build reaches it.";
}

function Covers({ kind, bp }: { kind: BuildItemKind; bp: BuildProduct }) {
  const { job } = useProduct();
  const lines = coversFor(kind, bp, isSampleModel(job?.modelGlbUrl), bp.id !== "primary");
  return (
    <section aria-labelledby="pc-covers" className="flex flex-col gap-3">
      <h2 id="pc-covers" className="text-lg font-semibold leading-lg text-text-primary">
        What this covers
      </h2>
      <ul className="flex list-disc flex-col gap-2 pl-8 text-md leading-md text-text-secondary">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </section>
  );
}

// ─────────────────────────── the states ───────────────────────────

function NotBuilt({ kind, bp }: { kind: BuildItemKind; bp: BuildProduct }) {
  const { canEdit } = useProduct();
  const [adding, setAdding] = React.useState(false);
  return (
    <div className={cn(LIST_CARD, "gap-4 border-dashed p-8")}>
      <p className="text-md font-semibold leading-md text-text-primary">{PIECES[kind].name} · Not built</p>
      <p className="text-md leading-md text-text-secondary">{PIECES[kind].addsLater}</p>
      <p className="text-sm leading-sm text-text-secondary">{notBuiltCostLine(kind)}</p>
      {canEdit && (
        <Button hierarchy="secondary" size="xl" className="self-start" onClick={() => setAdding(true)}>
          Add pieces
        </Button>
      )}
      {adding && <AddPiecesSheet bp={bp} preselect={[kind]} onClose={() => setAdding(false)} />}
    </div>
  );
}

function Failed({ kind }: { kind: BuildItemKind }) {
  const { job, bp, chat, canEdit } = useProduct();
  const { retryBuildItem } = useCreateHistory();
  const toast = useToast();
  const system = job?.failure === "system";
  return (
    <div className="flex flex-col gap-6">
      <Banner tone="error" title="This piece failed in this build">
        {system
          ? "The whole build stopped on our side — try it again from the chat."
          : "Rebuild it, or ask in the chat what went wrong. The other pieces are unaffected, and retrying costs no extra credits."}
      </Banner>
      {canEdit && !system && job && bp && (
        <Button
          size="xl"
          className="w-full"
          onClick={() => {
            retryBuildItem(job.id, kind, bp.id);
            toast({ title: `Rebuilding ${ITEM_LABELS[kind]}` });
          }}
        >
          Rebuild this piece
        </Button>
      )}
      {chat && (
        <Link href={`/m/ai?chat=${encodeURIComponent(chat.id)}`} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full")}>
          Open chat
        </Link>
      )}
    </div>
  );
}

// ─────────────────────────── a ready piece ───────────────────────────

function ReadyPiece({ kind, bp }: { kind: BuildItemKind; bp: BuildProduct }) {
  const { job } = useProduct();
  switch (kind) {
    case "pcb":
      return (
        <div className="flex flex-col gap-3">
          <Zoomable label="PCB layout, scrollable">
            <PcbPreview job={bp} />
          </Zoomable>
          <p className="text-sm leading-sm text-text-secondary">Pinch to zoom.</p>
        </div>
      );
    case "wiring":
      return (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Zoomable label="Wiring map, scrollable">
              <WiringPreview job={bp} />
            </Zoomable>
            <p className="text-sm leading-sm text-text-secondary">Pinch to zoom.</p>
          </div>
          <PinTable bp={bp} />
        </div>
      );
    case "code":
      return <CodeView bp={bp} />;
    case "parts":
      return <PartsTable bp={bp} />;
    case "3d":
    case "assembly":
      return job ? <ModelPiece job={job} product={bp} kind={kind} /> : null;
  }
}

/** A drawing that pinches to zoom (1×–3×) and scrolls inside its box; a double tap toggles 2×. */
function Zoomable({ label, children }: { label: string; children: React.ReactNode }) {
  const [scale, setScale] = React.useState(1);
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const start = React.useRef<{ d: number; s: number } | null>(null);
  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      onPointerDown={(e) => {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2) start.current = { d: dist(), s: scale };
      }}
      onPointerMove={(e) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2 && start.current && start.current.d > 0) {
          setScale(Math.min(3, Math.max(1, (start.current.s * dist()) / start.current.d)));
        }
      }}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) start.current = null;
      }}
      onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
      onDoubleClick={() => setScale((s) => (s > 1 ? 1 : 2))}
      className="max-h-[420px] touch-pan-x touch-pan-y overflow-auto rounded-xl border-[length:var(--border-width-1)] border-solid border-border-default outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <div style={{ width: `${scale * 100}%` }}>{children}</div>
    </div>
  );
}

function PinTable({ bp }: { bp: BuildProduct }) {
  const nets = netsFor(bp);
  const name = new Map(nets.nodes.map((n) => [n.id, n.label]));
  const short = (ref: string) => {
    const label = name.get(ref);
    return label && label !== ref ? `${ref} · ${label}` : ref;
  };
  return (
    <section aria-labelledby="pc-pins" className="flex flex-col gap-3">
      <h2 id="pc-pins" className="text-lg font-semibold leading-lg text-text-primary">
        Pin to pin
      </h2>
      <div className="overflow-x-auto rounded-xl border-[length:var(--border-width-1)] border-solid border-border-default">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <thead>
            <tr className="bg-bg-subtle">
              {["Net", "From", "To"].map((h) => (
                <th key={h} scope="col" className="px-6 py-4 text-sm font-medium leading-sm text-text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nets.wires.map((w, i) => (
              <tr key={`${w.label}-${i}`} className="border-t-[length:var(--border-width-1)] border-solid border-border-subtle">
                <td className="px-6 py-4 font-mono text-sm leading-sm text-text-primary">{w.label}</td>
                <td className="px-6 py-4 text-sm leading-sm text-text-secondary">{short(w.from)}</td>
                <td className="px-6 py-4 text-sm leading-sm text-text-secondary">{short(w.to)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CodeView({ bp }: { bp: BuildProduct }) {
  const fw = firmwareFor(bp);
  return (
    <div className="flex flex-col gap-3">
      <div role="region" aria-label="Firmware code, scrollable" tabIndex={0} className="overflow-hidden rounded-xl border-[length:var(--border-width-1)] border-solid border-border-default outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
        <div className="flex items-center justify-between gap-4 border-b-[length:var(--border-width-1)] border-solid border-border-default bg-bg-subtle px-6 py-4">
          <span className="truncate font-mono text-sm leading-sm text-text-primary">{fw.filename}</span>
          <span className="shrink-0 text-sm leading-sm text-text-secondary">{fw.lines.length} lines</span>
        </div>
        <div className="max-h-[480px] overflow-auto bg-bg-surface">
          <pre className="flex font-mono text-sm leading-sm">
            <code aria-hidden className="select-none border-r-[length:var(--border-width-1)] border-solid border-border-subtle px-4 py-4 text-right text-text-tertiary">
              {fw.lines.map((_, i) => (
                <span key={i} className="block">
                  {i + 1}
                </span>
              ))}
            </code>
            <code className="px-4 py-4 text-text-primary">
              {fw.lines.map((l, i) => (
                <span key={i} className="block whitespace-pre">
                  {l === "" ? " " : l}
                </span>
              ))}
            </code>
          </pre>
        </div>
      </div>
      <p className="text-sm leading-sm text-text-secondary">Scroll sideways for long lines. The code opens to edit on a computer.</p>
    </div>
  );
}

function PartsTable({ bp }: { bp: BuildProduct }) {
  const bom = bomFor(bp);
  const summary: [string, number][] = [
    ["Unique parts", bom.unique],
    ["Total units", bom.units],
    ["Active devices", bom.active],
    ["Passives", bom.passives],
    ["Connectors & mech", bom.connectors],
  ];
  return (
    <div className="flex flex-col gap-8">
      <div role="region" aria-label="Parts list, scrollable" tabIndex={0} className="overflow-x-auto rounded-xl border-[length:var(--border-width-1)] border-solid border-border-default outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-bg-subtle">
              {["Ref", "Part", "Category", "Qty"].map((h) => (
                <th key={h} scope="col" className="px-6 py-4 text-sm font-medium leading-sm text-text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bom.rows.map((r) => (
              <tr key={r.ref} className="border-t-[length:var(--border-width-1)] border-solid border-border-subtle align-top">
                <td className="whitespace-nowrap py-4 pl-6 pr-3 font-mono text-sm leading-sm text-text-secondary">{r.ref}</td>
                <td className="px-3 py-4 text-sm leading-sm text-text-primary">{r.name}</td>
                <td className="px-3 py-4 text-sm leading-sm text-text-secondary">{r.category}</td>
                <td className="py-4 pl-3 pr-6 text-right text-sm leading-sm text-text-secondary">{r.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section aria-labelledby="pc-summary" className="flex flex-col gap-3">
        <h2 id="pc-summary" className="text-lg font-semibold leading-lg text-text-primary">
          Summary
        </h2>
        <dl className={LIST_CARD}>
          {summary.map(([k, v]) => (
            <div key={k} className={cn(LIST_ROW, "flex items-center justify-between gap-6 px-6 py-4")}>
              <dt className="text-md leading-md text-text-secondary">{k}</dt>
              <dd className="text-md leading-md text-text-primary">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

// ─────────────────────────── the footer ───────────────────────────

function PieceFooter({ kind, bp, ready }: { kind: BuildItemKind; bp: BuildProduct; ready: boolean }) {
  const { downloads, mode, view, path } = useProduct();
  const router = useRouter();
  const tracks = useListedCopies();
  if (!ready) return null;
  const file = fileFor(kind, bp);
  if (!file) return null;
  if (downloads) {
    return (
      <BottomBar>
        <Button hierarchy="secondary" size="xl" className="w-full" iconLeading={<Icon icon={Download04Icon} size={20} />} onClick={() => save(file)}>
          {file.label}
        </Button>
      </BottomBar>
    );
  }
  const from = copiesFromOf(tracks, (t) => trackCardOf(t, view.sales).soldOut);
  return (
    <BottomBar>
      <Button
        hierarchy="secondary"
        size="xl"
        className="w-full"
        disabled={mode !== "market" || !from}
        iconLeading={<Icon icon={SquareLock02Icon} size={20} />}
        onClick={() => router.push(path("", { buy: "1" }))}
      >
        {from ? `Buy a copy to download · ${formatAmount(from.amount, from.token)}` : "Files come with a copy"}
      </Button>
    </BottomBar>
  );
}

// ─────────────────────────── a Feed sample's piece ───────────────────────────

function SamplePiece({ projectId, product, kind }: { projectId: string; product: PostProduct; kind: BuildItemKind }) {
  const back = `${phoneProductPath(projectId, product.id)}?tab=build`;
  return (
    <Screen top={<TopBar back={back} title={ITEM_LABELS[kind]} />}>
      <div className="flex flex-col gap-8 px-8 pb-12">
        <p className="text-sm leading-sm text-text-secondary">{product.name} · files come with a copy</p>
        {kind === "parts" ? (
          <div role="region" aria-label="Parts list, scrollable" tabIndex={0} className="overflow-x-auto rounded-xl border-[length:var(--border-width-1)] border-solid border-border-default">
            <table className="w-full min-w-[360px] border-collapse text-left">
              <thead>
                <tr className="bg-bg-subtle">
                  {["Part", "Qty", "What it does"].map((h) => (
                    <th key={h} scope="col" className="px-6 py-4 text-sm font-medium leading-sm text-text-secondary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {product.parts.map((p) => (
                  <tr key={p.name} className="border-t-[length:var(--border-width-1)] border-solid border-border-subtle">
                    <td className="px-6 py-4 text-sm leading-sm text-text-primary">{p.name}</td>
                    <td className="px-6 py-4 text-sm leading-sm text-text-secondary">{p.qty}</td>
                    <td className="px-6 py-4 text-sm leading-sm text-text-secondary">{p.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : kind === "3d" ? (
          <div className={cn(LIST_CARD, "items-center gap-6 p-8 text-center")}>
            {product.image && (
              // eslint-disable-next-line @next/next/no-img-element -- a sample post's image
              <img src={product.image} alt={product.name} className="aspect-[4/3] w-full rounded-md bg-bg-surface-raised object-cover" />
            )}
            <p className="text-md leading-md text-text-secondary">This sample has no 3D file to open — its creator shares the image only.</p>
          </div>
        ) : (
          <Banner tone="info" title="Comes with a copy">
            {`${ITEM_LABELS[kind]} files come with a copy of ${product.name}.`}
          </Banner>
        )}
      </div>
    </Screen>
  );
}
