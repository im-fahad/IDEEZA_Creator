"use client";

// The 3D Module and Assembly viewer on a phone (Product Details 10k, 10l,
// 30a–30d): the web's assembly (lib/three/assembly.ts) and WebGL viewer
// (`AssemblyViewer`, three.js in its own chunk), driven by the web panel's
// own rules (`viewReducer`), laid out for a phone and view only (D3):
// - before it loads: "The 3D model loads when you open it." and View in 3D
//   (the concept image above it), so three.js arrives only when asked;
// - the viewer: Fullscreen and Reset the view on it, the hint under it
//   ("Tap a part to inspect it", "1 part selected · tap the model to clear",
//   …), the part under a tap ringed;
// - Explode (a slider with its %), Front · Side · Top;
// - the rail's facts, under it: Model (parts · systems), Systems with each
//   one's count and a switch, "n visible", What ships;
// - a tapped part opens as a sheet (30a): its system, name and what it does,
//   Part reference / Quantity / Material / Mass / System, Isolate this part
//   (Exit isolation), Clear selection, Other parts in this system;
// - Preparing the 3D model (30b), We couldn't open the 3D model + Try again
//   (30c), Nothing to show + Show all systems (30d), the systems list kept.

import * as React from "react";
import { Cancel01Icon, FullScreenIcon, ReloadIcon, ThreeDViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { ButtonGroup } from "@/components/ideeza/button-group";
import { IconButton } from "@/components/ideeza/icon-button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Slider } from "@/components/ideeza/slider";
import { Toggle } from "@/components/ideeza/toggle";
import { AssemblyViewer } from "@/components/create/model-panel/assembly-viewer";
import { INITIAL_VIEW, viewReducer, type View, type ViewAction } from "@/components/create/model-panel/model-panel";
import { Rings } from "@/components/create/model-panel/model-overlays";
import type { ScreenBox, ViewPreset } from "@/components/create/model-panel/viewer-types";
import type { BuildJob, BuildProduct } from "@/lib/create/history";
import { mm3 } from "@/lib/spec/units";
import { deriveAssembly, enclosureOnly, SYSTEM_LABEL, type Assembly } from "@/lib/three/assembly";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { LIST_CARD, LIST_ROW } from "../project/parts";

const PRESETS: { label: string; value: Exclude<ViewPreset, "iso"> }[] = [
  { label: "Front", value: "front" },
  { label: "Side", value: "side" },
  { label: "Top", value: "top" },
];

/** The web's ModelTab rule: the 3D Module shows the enclosure alone when the build has an
 *  Assembly piece to show the rest; only the primary product wears the generated mesh. */
export function assemblyOf(job: BuildJob, product: BuildProduct, kind: "3d" | "assembly"): Assembly {
  const shellOnly = kind === "3d" && product.items.some((i) => i.kind === "assembly" && (i.status !== "skipped" || i.omitted));
  const a = deriveAssembly({
    title: product.title,
    parts: product.parts,
    spec: product.spec,
    meshUrl: product.id === "primary" ? job.modelGlbUrl : undefined,
  });
  return shellOnly ? enclosureOnly(a) : a;
}

/** 10k: the resting state, then the viewer once asked for. */
export function ModelPiece({ job, product, kind }: { job: BuildJob; product: BuildProduct; kind: "3d" | "assembly" }) {
  const [open, setOpen] = React.useState(false);
  const assembly = React.useMemo(() => (open ? assemblyOf(job, product, kind) : null), [open, job, product, kind]);
  if (!open || !assembly) {
    return (
      <div className={cn(LIST_CARD, "items-center gap-6 p-8 text-center")}>
        {product.conceptImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- the concept image from the build store
          <img src={product.conceptImageUrl} alt={`${product.name} concept image`} className="aspect-[4/3] w-full rounded-md bg-bg-surface-raised object-cover" />
        )}
        <p className="text-md leading-md text-text-secondary">The 3D model loads when you open it.</p>
        <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={ThreeDViewIcon} size={20} />} onClick={() => setOpen(true)}>
          View in 3D
        </Button>
      </div>
    );
  }
  return <ModelView assembly={assembly} label={`${kind === "assembly" ? "Assembly" : "3D Module"} of ${product.name}`} />;
}

export function ModelView({ assembly, label }: { assembly: Assembly; label: string }) {
  const systemOf = React.useCallback((id: string) => assembly.parts.find((p) => p.id === id)?.system, [assembly.parts]);
  const [view, dispatch] = React.useReducer((v: View, a: ViewAction) => viewReducer(v, a, systemOf), INITIAL_VIEW);
  const [boxes, setBoxes] = React.useState<{ hover?: ScreenBox; selected?: ScreenBox }>({});
  const [ready, setReady] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);

  const visible = assembly.parts.filter((p) => !view.hidden.has(p.system));
  const allHidden = visible.length === 0;
  const loading = !ready && !failed && !allHidden;
  const selected = view.selectedId ? (assembly.parts.find((p) => p.id === view.selectedId) ?? null) : null;
  const fullscreen = view.fullscreen;

  React.useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ t: "fullscreen", on: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const hint = view.isolatedId
    ? "Isolated view · Exit isolation to see the model"
    : view.selectedId
      ? "1 part selected · tap the model to clear"
      : view.hidden.size > 0
        ? `${view.hidden.size} ${view.hidden.size === 1 ? "system" : "systems"} hidden · ${visible.length} parts visible`
        : "Tap a part to inspect it";

  return (
    <div className="flex flex-col gap-6">
      <div
        role="region"
        aria-label={label}
        className={cn(
          "relative overflow-hidden border-[length:var(--border-width-1)] border-solid border-border-default bg-bg-subtle",
          fullscreen ? "fixed inset-0 z-sheet rounded-none" : "h-[300px] w-full rounded-xl",
        )}
      >
        {!allHidden && !failed && (
          <AssemblyViewer
            key={attempt}
            assembly={assembly}
            explode={view.explode}
            hidden={view.hidden}
            isolatedId={view.isolatedId}
            hoverId={view.hoverId}
            selectedId={view.selectedId}
            preset={view.preset}
            cameraNonce={view.cameraNonce}
            cameraCommand={view.cameraCommand}
            panWithLeft={false}
            onHover={() => undefined}
            onPick={(id) => dispatch({ t: "select", id })}
            onBoxes={setBoxes}
            onMounted={() => setMounted(true)}
            onReady={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        )}
        {ready && !allHidden && !view.isolatedId && <Rings selected={boxes.selected} tooltip={undefined} />}

        {!loading && !failed && !allHidden && (
          <div className="absolute right-4 top-4 flex gap-4">
            <IconButton
              hierarchy="secondary"
              size="xl"
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              icon={<Icon icon={fullscreen ? Cancel01Icon : FullScreenIcon} size={20} />}
              onClick={() => dispatch({ t: "fullscreen", on: !fullscreen })}
            />
            <IconButton hierarchy="secondary" size="xl" aria-label="Reset the view" icon={<Icon icon={ReloadIcon} size={20} />} onClick={() => dispatch({ t: "reset" })} />
          </div>
        )}
        {!loading && !failed && !allHidden && (
          <p className="absolute bottom-4 left-4 rounded-md bg-bg-surface px-4 py-2 text-sm leading-sm text-text-secondary">{hint}</p>
        )}

        {loading && (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="text-md font-semibold leading-md text-text-primary">Preparing the 3D model</span>
            <span className="text-sm leading-sm text-text-secondary">
              Assembling {assembly.parts.length} {assembly.parts.length === 1 ? "part" : "parts"} from the build
            </span>
            <ProgressBar value={mounted ? 70 : 20} label="Preparing the 3D model" className="w-[220px] max-w-full" />
            <span className="text-sm leading-sm text-text-secondary">This usually takes a few seconds</span>
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="text-md font-semibold leading-md text-text-primary">We couldn’t open the 3D model</span>
            <span className="text-sm leading-sm text-text-secondary">The 3D viewer couldn’t start. Your PCB, firmware and wiring files are unaffected.</span>
            <Button
              hierarchy="secondary"
              size="xl"
              onClick={() => {
                setFailed(false);
                setReady(false);
                setMounted(false);
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          </div>
        )}
        {allHidden && !failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="text-md font-semibold leading-md text-text-primary">Nothing to show</span>
            <span className="text-sm leading-sm text-text-secondary">Every system is switched off. Turn one back on to see the model.</span>
            <Button size="xl" onClick={() => dispatch({ t: "showAll" })}>
              Show all systems
            </Button>
          </div>
        )}
      </div>

      {!loading && !failed && !allHidden && !view.isolatedId && (
        <>
          <div className="flex items-center gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-default bg-bg-surface px-6 py-2">
            <span id="m-explode" className="text-sm font-medium leading-sm text-text-secondary">
              Explode
            </span>
            <div className="flex min-h-[44px] min-w-0 flex-1 items-center">
              <Slider value={view.explode} onValueChange={(v) => dispatch({ t: "explode", v })} min={0} max={100} aria-labelledby="m-explode" className="w-full" />
            </div>
            <span className="w-[40px] text-right text-sm leading-sm text-text-primary">{view.explode}%</span>
          </div>
          <ButtonGroup
            size="xl"
            items={PRESETS}
            value={view.preset}
            onChange={(p) => dispatch({ t: "preset", p: p as ViewPreset })}
            className="w-full [&>button]:flex-1"
          />
        </>
      )}

      {!loading && !failed && <Systems assembly={assembly} hidden={view.hidden} onToggle={(id) => dispatch({ t: "toggleSystem", id })} />}

      <Sheet open={selected !== null} onClose={() => dispatch({ t: "select", id: null })} title={selected?.name ?? ""} description={selected ? SYSTEM_LABEL[selected.system] : undefined}>
        {selected && (
          <div className="flex flex-col gap-6 pb-8">
            <p className="text-md leading-md text-text-secondary">{selected.description}</p>
            <dl className={LIST_CARD}>
              {(
                [
                  ["Part reference", selected.ref],
                  ["Quantity", `${selected.instance.n} of ${selected.instance.of}`],
                  ...(selected.material ? [["Material", selected.material]] : []),
                  ...(selected.massG !== undefined ? [["Mass", `${selected.massG} g`]] : []),
                  ["System", SYSTEM_LABEL[selected.system]],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className={cn(LIST_ROW, "flex items-center justify-between gap-6 p-6")}>
                  <dt className="text-md leading-md text-text-secondary">{k}</dt>
                  <dd className="text-md leading-md text-text-primary">{v}</dd>
                </div>
              ))}
            </dl>
            {view.isolatedId === selected.id ? (
              <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => dispatch({ t: "exitIsolation" })}>
                Exit isolation
              </Button>
            ) : (
              <Button size="xl" className="w-full" onClick={() => dispatch({ t: "isolate" })}>
                Isolate this part
              </Button>
            )}
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => dispatch({ t: "wholeModel" })}>
              Clear selection
            </Button>
            {(() => {
              const others = assembly.parts.filter((p) => p.system === selected.system && p.id !== selected.id);
              if (!others.length) return null;
              return (
                <section className="flex flex-col gap-3">
                  <h3 className="text-md font-semibold leading-md text-text-primary">Other parts in this system</h3>
                  <ul className={LIST_CARD}>
                    {others.map((o) => (
                      <li key={o.id} className={LIST_ROW}>
                        <button
                          type="button"
                          onClick={() => dispatch({ t: "select", id: o.id })}
                          className="flex min-h-[44px] w-full items-center gap-4 px-6 py-3 text-left outline-none hover:bg-bg-subtle focus-visible:bg-bg-subtle"
                        >
                          <span className="min-w-0 flex-1 truncate text-md leading-md text-text-primary">{o.name}</span>
                          <span className="text-sm leading-sm text-text-secondary">{o.ref}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })()}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function Systems({ assembly, hidden, onToggle }: { assembly: Assembly; hidden: ReadonlySet<string>; onToggle: (id: Assembly["systems"][number]["id"]) => void }) {
  const total = assembly.parts.length;
  const visibleParts = assembly.parts.filter((p) => !hidden.has(p.system)).length;
  const ships = [mm3(assembly.size), `${assembly.material} · ${assembly.wallMm} mm wall`, ...(assembly.board ? [`Mount points for the ${assembly.board.w} × ${assembly.board.h} mm board`] : [])];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm leading-sm text-text-secondary">Model</p>
        <p className="text-md font-semibold leading-md text-text-primary">
          {assembly.title} · {total} {total === 1 ? "part" : "parts"} · {assembly.systems.length} {assembly.systems.length === 1 ? "system" : "systems"}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center">
          <p className="flex-1 text-sm leading-sm text-text-secondary">Systems</p>
          <p className={cn("text-sm leading-sm", hidden.size ? "text-text-brand" : "text-text-secondary")}>
            {hidden.size ? `${visibleParts} of ${total}` : `${total} visible`}
          </p>
        </div>
        <ul className={LIST_CARD}>
          {assembly.systems.map((s) => {
            const on = !hidden.has(s.id);
            return (
              <li key={s.id} className={cn(LIST_ROW, "flex min-h-[44px] items-center gap-4 px-6")}>
                <span className="min-w-0 flex-1 truncate text-md leading-md text-text-primary">
                  {s.label} <span className="text-sm text-text-secondary">{s.count}</span>
                </span>
                <span className="flex min-h-[44px] items-center">
                  <Toggle checked={on} onChange={() => onToggle(s.id)} aria-label={`Show ${s.label}`} />
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-sm text-text-secondary">What ships</p>
        <div className="flex flex-wrap gap-3">
          {ships.map((l) => (
            <Badge key={l} tone="neutral">
              {l}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
