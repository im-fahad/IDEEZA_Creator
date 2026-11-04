"use client";

// The 3D Module and Assembly tabs on a phone (19 · 20 · 21 · A7): the web's
// own assembly (lib/three/assembly.ts — the product's parts, sized by the
// spec, on its board, in its enclosure; the shell is the concept mesh once
// one is made) in the web's WebGL viewer, with the Figma's controls: zoom in
// and out, back to the start view, and the Explode slider (100 % lays every
// part out). Tapping a part names it; tapping it again clears it. The 3D
// Module is the enclosure alone where the build has an Assembly piece.

import * as React from "react";
import { MinusSignIcon, PlusSignIcon, Rotate01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { AssemblyViewer } from "@/components/create/model-panel/assembly-viewer";
import { INITIAL_VIEW, viewReducer, type View, type ViewAction } from "@/components/create/model-panel/model-panel";
import type { Assembly } from "@/lib/three/assembly";
import { SYSTEM_LABEL } from "@/lib/three/assembly";
import { cn } from "@/lib/utils";

export function ModelView({ assembly, shellNote, onRetryMesh }: { assembly: Assembly; shellNote: "pending" | "failed" | null; onRetryMesh?: () => void }) {
  const systemOf = React.useCallback((id: string) => assembly.parts.find((p) => p.id === id)?.system, [assembly.parts]);
  const [view, dispatch] = React.useReducer((v: View, a: ViewAction) => viewReducer(v, a, systemOf), INITIAL_VIEW);
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const selected = view.selectedId ? assembly.parts.find((p) => p.id === view.selectedId) ?? null : null;
  const hint = !ready
    ? "Opening the 3D model…"
    : selected
      ? `${selected.name} · ${selected.ref} · ${SYSTEM_LABEL[selected.system]}`
      : view.explode === 100
        ? `${assembly.parts.length} parts separated · tap any part to identify`
        : "Tap a part to inspect it";

  return (
    <div className="flex flex-col gap-5">
      <div className="relative h-[230px] overflow-hidden rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-brand-subtle">
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-md font-medium leading-md text-text-primary">We couldn&apos;t open the 3D model</p>
            <Button
              hierarchy="secondary"
              size="md"
              onClick={() => {
                setFailed(false);
                setReady(false);
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          </div>
        ) : (
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
            onHover={(id) => dispatch({ t: "hover", id })}
            onPick={(id) => dispatch({ t: "select", id: id === view.selectedId ? null : id })}
            onBoxes={() => undefined}
            onMounted={() => undefined}
            onReady={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        )}
        {!failed && (
          <div className="absolute bottom-4 right-4 flex flex-col gap-3">
            {[
              { icon: PlusSignIcon, label: "Zoom in", act: () => dispatch({ t: "camera", c: "zoom-in" }) },
              { icon: MinusSignIcon, label: "Zoom out", act: () => dispatch({ t: "camera", c: "zoom-out" }) },
              { icon: Rotate01Icon, label: "Back to the start view", act: () => dispatch({ t: "camera", c: "home" }) },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                aria-label={b.label}
                onClick={b.act}
                className="inline-flex size-[36px] items-center justify-center rounded-lg border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface text-[color:var(--color-icon-default)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={b.icon} size={18} />
              </button>
            ))}
          </div>
        )}
      </div>
      <label className="flex flex-col gap-3">
        <span className="flex items-center justify-between">
          <span className="text-md font-medium leading-md text-text-primary">Explode</span>
          <span className="rounded-full bg-bg-subtle px-3 text-xs leading-xs tabular-nums text-text-secondary">{view.explode}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={view.explode}
          onChange={(e) => dispatch({ t: "explode", v: Number(e.target.value) })}
          className="h-[24px] w-full accent-[var(--color-bg-brand)]"
          aria-valuetext={`${view.explode}% apart`}
        />
      </label>
      <p role="status" className={cn("text-center text-sm leading-sm", selected ? "text-text-primary" : "text-text-secondary")}>
        {hint}
      </p>
      {shellNote === "pending" && <p className="text-sm leading-sm text-text-tertiary">The enclosure takes the concept&apos;s shape once its 3D mesh is made; until then it is sized from the parts.</p>}
      {shellNote === "failed" && (
        <p className="text-sm leading-sm text-text-secondary">
          The concept shape couldn&apos;t be made, so the enclosure is sized from the parts.{" "}
          {onRetryMesh && (
            <button type="button" onClick={onRetryMesh} className="font-medium text-text-brand hover:underline">
              Try again
            </button>
          )}
        </p>
      )}
    </div>
  );
}
