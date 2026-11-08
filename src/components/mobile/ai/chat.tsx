"use client";

// AI Product Generate — one chat, from the idea to the saved project (Full AI
// flow 05–18, the single- and double-product rows, A1–A8): the step line,
// the maker's idea, the reading card, the question, the concepts, the
// network, the Build line, then the build itself and its summary; the
// composer at the foot (held once a build holds the concepts). ⋯ has the
// Build log, History, a new idea and Delete. All of it runs on the web's
// stores through `useConceptFlow`.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Add01Icon, AiMagicIcon, AnalyticsUpIcon, Clock01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { StateCard } from "@/components/ideeza/state-card";
import { useSecondClock } from "@/components/create/use-clock";
import { CONCEPT_COST } from "@/lib/create/credits";
import { jobCost, statusOf } from "@/lib/create/history";
import { Screen } from "../screen";
import { MORE_ICON, TopBar } from "../top-bar";
import { ActionSheet } from "../kit/sheet";
import { OfflineBanner } from "../kit/states";
import { useToast } from "../kit/toast";
import { BuildCard, BuildConfirmSheet, FinishedCard, FinishedFoot } from "./build";
import { BuildLogSheet } from "./build-log-sheet";
import { BuildBar, BuildOptionsSheet, ConceptImageViewer, ConceptSheet, ConceptStage, ConceptsMini, RefineSheet } from "./concepts";
import { DeleteChatSheet } from "./delete-chat-sheet";
import { NetworkCard } from "./network";
import { CreditsFoot, PromptBubble, Stepper } from "./parts";
import { PromptBox } from "./prompt-box";
import { SaveSheet } from "./save-sheet";
import { ProductQuestion, ProjectSheet, ReadingCard, RequiredStep } from "./setup";
import { SpecSheet } from "./spec-sheet";
import { useConceptFlow, type Gate, type SetupTurn } from "./use-concept-flow";

export function AiChat({ chatId }: { chatId: string }) {
  const flow = useConceptFlow(chatId);
  const router = useRouter();
  const toast = useToast();
  const { chat } = flow;
  const setup = chat?.turns.find((t): t is SetupTurn => t.role === "setup");
  const firstAsk = chat?.turns.find((t) => t.role === "user");
  const drawing = flow.rail.rows.some((r) => r.phase === "drawing") || setup?.status === "loading";
  const now = useSecondClock(drawing);

  // ── the question ──
  const [picks, setPicks] = React.useState<Set<string> | null>(null);
  const [productsConfirmed, setProductsConfirmed] = React.useState(false);
  const [projectDismissed, setProjectDismissed] = React.useState(false);
  const asking = setup?.status === "asking";
  const picked = picks ?? new Set(setup?.companions.map((c) => c.id) ?? []);
  const needsProductQ = asking && (setup?.companions.length ?? 0) > 0 && !productsConfirmed;
  const projectOpen = asking && !needsProductQ && !projectDismissed;

  // ── the sheets ──
  const [sheetFor, setSheetFor] = React.useState<string | null>(null);
  const [refineTurn, setRefineTurn] = React.useState<string | null>(null);
  const [specFor, setSpecFor] = React.useState<string | null>(null);
  const [gate, setGate] = React.useState<Gate | null>(null);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [logOpen, setLogOpen] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [buildProduct, setBuildProduct] = React.useState("primary");
  const [conceptProduct, setConceptProduct] = React.useState("primary");
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  const [imageFor, setImageFor] = React.useState<string | null>(null);

  const job = flow.activeBuild;
  const jobStatus = job ? statusOf(job) : null;

  const startBuild = async () => {
    const result = await flow.prepareBuild();
    if (!result) return;
    if ("blocked" in result) {
      toast({ title: "A product doesn't fit the size you set — fix it in its spec", lead: "error" });
      setSpecFor(result.blocked);
      return;
    }
    setGate(result.gate);
  };

  if (!flow.hydrated) {
    return (
      <Screen top={<TopBar back="/m/ai" title="AI Product Generate" />}>
        <div role="status" aria-label="Loading" className="flex flex-col gap-6 p-8">
          <Skeleton className="ml-auto h-[64px] w-[240px] rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <Skeleton size="lg" className="w-full rounded-xl" />
        </div>
      </Screen>
    );
  }
  if (!chat) {
    return (
      <Screen top={<TopBar back="/m/ai" title="AI Product Generate" />} className="p-8">
        <StateCard
          tone="empty"
          className="w-full"
          icon={<Icon icon={AiMagicIcon} size={32} />}
          title="This chat isn't on this phone"
          body="It may have been deleted, or it was started in another browser."
          action={
            <Link href="/m/ai" className={buttonVariants({ size: "lg" })}>
              Start a new idea
            </Link>
          }
        />
      </Screen>
    );
  }

  const placeholder =
    flow.target.kind === "refine"
      ? `Describe a change to ${flow.target.name}…`
      : flow.target.kind === "blocked" && flow.target.why === "drawing"
        ? "Add a product while concepts draw…"
        : flow.target.kind === "none"
          ? "Pick a product to change, or describe a new one…"
          : "Describe your device";
  const conceptsDrawn = chat.turns.filter((t) => t.role === "assistant" && t.status !== "failed").length;
  const footRight = job
    ? `Build · ${jobCost(job)} credits`
    : setup?.status === "answered"
      ? `${conceptsDrawn} ${conceptsDrawn === 1 ? "concept" : "concepts"} · ${conceptsDrawn * CONCEPT_COST} ${conceptsDrawn === 1 ? "credit" : "credits"}`
      : "1 credit per concept";

  const answered = setup?.status === "answered";
  // Image first (the owner's approved sample): once the concepts are on the
  // page the composer gives way — changes go through each product's Change
  // sheet — and the Build line is pinned at the foot; once the build is
  // finished, Save is.
  const conceptStage = answered && flow.rail.rows.length > 0;
  const finished = !!job && jobStatus === "ready";
  const buildBar = conceptStage && (!job || !flow.held);

  const footer = finished && job ? (
    <div className="pt-4">
      <FinishedFoot job={job} flow={flow} onSave={() => setSaveOpen(true)} />
      <CreditsFoot right={footRight} />
    </div>
  ) : buildBar ? (
    <div className="flex flex-col gap-3 pt-4">
      {job && flow.state.changedSinceBuild && (
        <p className="px-8 text-sm leading-sm text-text-secondary">Changed since this build — build again to carry the change into the deliverables.</p>
      )}
      <div className="px-8">
        <BuildBar flow={flow} onBuild={startBuild} onOptions={() => setOptionsOpen(true)} />
      </div>
      <CreditsFoot right={footRight} />
    </div>
  ) : conceptStage || flow.held ? (
    <div className="pt-2">
      <CreditsFoot right={footRight} />
    </div>
  ) : (
    <div className="pt-4">
      <PromptBox
        value={draft}
        onChange={setDraft}
        placeholder={placeholder}
        sendKind="send"
        enhanceMode={flow.target.kind === "refine" ? "change" : "brief"}
        disabled={flow.setupPending}
        canSend={flow.canRender}
        sendReason={!flow.canRender ? "You are out of credits — top them up to draw another concept." : undefined}
        onSubmit={(text) => {
          if (flow.submit(text)) return;
          toast({
            title:
              flow.target.kind === "blocked"
                ? `${flow.target.hint}. To add a product, name it — "add a charger".`
                : "Pick a product above first — or name a new one to add it",
          });
          return false;
        }}
      />
      <CreditsFoot right={footRight} />
    </div>
  );

  return (
    <>
      <Screen
        top={
          <>
            <TopBar back="/m/ai" title="AI Product Generate" actions={[{ icon: MORE_ICON, label: "More", onClick: () => setMenu(true) }]} />
            <Stepper stage={flow.stage} />
          </>
        }
        footer={footer}
      >
        <div className="flex flex-col gap-6 px-8 pb-8 pt-2">
          <OfflineBanner />
          {firstAsk?.role === "user" && <PromptBubble text={firstAsk.text} />}
          {setup && <ReadingCard setup={setup} now={now} projectName={flow.projectName} />}
          {needsProductQ && setup && (
            <ProductQuestion
              setup={setup}
              picked={picked}
              onToggle={(id) => {
                const next = new Set(picked);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                setPicks(next);
              }}
              onContinue={() => {
                setProductsConfirmed(true);
                setProjectDismissed(false);
              }}
            />
          )}
          {asking && !needsProductQ && projectDismissed && <RequiredStep onOpen={() => setProjectDismissed(false)} />}

          {finished && job && <FinishedCard job={job} flow={flow} product={buildProduct} onProduct={setBuildProduct} />}
          {job && !finished && <BuildCard job={job} product={buildProduct} onProduct={setBuildProduct} />}

          {conceptStage && !job && (
            <ConceptStage flow={flow} now={now} selected={conceptProduct} onSelect={setConceptProduct} onChange={setSheetFor} onImage={setImageFor} />
          )}
          {conceptStage && job && <ConceptsMini flow={flow} onOpen={setSheetFor} />}
          {answered && <NetworkCard flow={flow} />}
        </div>
      </Screen>

      {setup && asking && (
        <ProjectSheet
          open={projectOpen}
          onClose={() => setProjectDismissed(true)}
          products={1 + picked.size}
          projects={flow.setupProjects}
          canAfford={(n) => flow.balance >= n || !flow.creditsHydrated}
          onStart={(a) => flow.answerSetup({ ...a, picked: [...picked].filter((id) => setup.companions.some((c) => c.id === id)) })}
        />
      )}
      <ConceptSheet
        flow={flow}
        productId={sheetFor}
        onClose={() => setSheetFor(null)}
        onRefine={(turnId) => {
          setSheetFor(null);
          setRefineTurn(turnId);
        }}
        onEditSpec={(id) => {
          setSheetFor(null);
          setSpecFor(id);
        }}
      />
      <RefineSheet flow={flow} turnId={refineTurn} onClose={() => setRefineTurn(null)} />
      <BuildOptionsSheet flow={flow} open={optionsOpen} onClose={() => setOptionsOpen(false)} />
      <ConceptImageViewer flow={flow} productId={imageFor} onClose={() => setImageFor(null)} />
      <SpecSheet flow={flow} productId={specFor} onClose={() => setSpecFor(null)} />
      <BuildConfirmSheet
        flow={flow}
        gate={gate}
        onClose={() => setGate(null)}
        onBooked={(blocked) => {
          setGate(null);
          if (blocked) setSpecFor(blocked);
          else toast({ title: "Build started — it runs in the background", lead: "success" });
        }}
      />
      {job && flow.saveInfo && <SaveSheet open={saveOpen} job={job} info={flow.saveInfo} onClose={() => setSaveOpen(false)} />}
      <BuildLogSheet open={logOpen} onClose={() => setLogOpen(false)} flow={flow} />
      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        items={[
          { label: "Build log", icon: AnalyticsUpIcon, onSelect: () => setLogOpen(true) },
          { label: "History", icon: Clock01Icon, onSelect: () => router.push("/m/ai/history") },
          { label: "New idea", icon: Add01Icon, onSelect: () => router.push("/m/ai") },
          { label: "Delete this chat", icon: Delete02Icon, onSelect: () => setDeleting(true), destructive: true },
        ]}
      />
      <DeleteChatSheet chat={deleting ? chat : null} onClose={() => setDeleting(false)} onDeleted={() => router.replace("/m/ai")} />
    </>
  );
}

