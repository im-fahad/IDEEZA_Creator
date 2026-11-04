"use client";

// Where did you hear about IDEEZA? (Notion Part 1): one-tap chips, in Notion's
// order. A chip saves at once; Other asks for a word first. Used right after
// verifying (SourceQuestion) and on Home when it was skipped (SourceNudge).

import * as React from "react";
import { useRouter } from "next/navigation";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { Tag } from "@/components/ideeza/tag";
import { TextInput } from "@/components/ideeza/text-input";
import {
  OTHER_MAX,
  SOURCES,
  SOURCE_WORDS,
  answerSource,
  closeSourceNudge,
  needsSourceQuestion,
  showsSourceNudge,
  skipSource,
  useAuth,
  type Source,
} from "@/lib/account/auth";
import { cn } from "@/lib/utils";
import { AuthHeading, FIELD_ERROR } from "./auth-parts";

const REFUSED = "This browser wouldn't save that. Check that it allows this site to store data, then try again.";

function SourcePicker({ onAnswered, center }: { onAnswered: () => void; center?: boolean }) {
  const [other, setOther] = React.useState(false);
  const [words, setWords] = React.useState("");
  const [refused, setRefused] = React.useState(false);
  const otherRef = React.useRef<HTMLInputElement>(null);

  const answer = (source: Source, typed = "") => {
    if (!answerSource(source, typed).ok) {
      setRefused(true);
      return;
    }
    onAnswered();
  };

  return (
    <div className="flex flex-col gap-[16px]">
      <div role="group" aria-label="Where you heard about IDEEZA" className={cn("flex flex-wrap gap-[8px]", center && "justify-center")}>
        {SOURCES.map((s) => (
          <Tag
            key={s}
            size="lg"
            selected={s === "other" && other}
            onClick={() => {
              if (s !== "other") answer(s);
              else {
                setOther(true);
                requestAnimationFrame(() => otherRef.current?.focus());
              }
            }}
          >
            {SOURCE_WORDS[s]}
          </Tag>
        ))}
      </div>
      {other ? (
        <form
          className="flex gap-[8px]"
          onSubmit={(e) => {
            e.preventDefault();
            answer("other", words);
          }}
        >
          <TextInput
            ref={otherRef}
            size="lg"
            value={words}
            onValueChange={setWords}
            maxLength={OTHER_MAX}
            placeholder="Where? (optional)"
            aria-label="Where you heard about IDEEZA"
            containerClassName="min-w-0 flex-1"
          />
          <Button type="submit" hierarchy="primary" size="lg">
            Continue
          </Button>
        </form>
      ) : null}
      {refused ? (
        <p role="alert" className={FIELD_ERROR}>
          {REFUSED}
        </p>
      ) : null}
    </div>
  );
}

/** The page right after verifying. Skip goes to Home, which asks again later. */
export function SourceQuestion() {
  const router = useRouter();
  const { hydrated, account, signedIn } = useAuth();
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated || leaving) return;
    if (!signedIn || !account || !needsSourceQuestion(account)) router.replace("/");
  }, [hydrated, account, signedIn, leaving, router]);

  if (!hydrated || !signedIn || !account || (!leaving && !needsSourceQuestion(account))) return null;

  const home = () => {
    setLeaving(true);
    router.replace("/");
  };

  return (
    <>
      <AuthHeading title={`Welcome, ${account.firstName}`}>One quick question: where did you hear about IDEEZA?</AuthHeading>
      <SourcePicker center onAnswered={home} />
      <div className="flex justify-center">
        <Button
          hierarchy="ghost"
          size="md"
          onClick={() => {
            skipSource();
            home();
          }}
        >
          Skip
        </Button>
      </div>
    </>
  );
}

/** Home's soft nudge after a Skip (Notion Part 1, Part 2.5): never forced, closes for good. */
export function SourceNudge({ className }: { className?: string }) {
  const { hydrated, account, signedIn } = useAuth();
  const titleId = React.useId();
  if (!hydrated || !signedIn || !account || !showsSourceNudge(account)) return null;
  return (
    <section
      aria-labelledby={titleId}
      className={cn("flex flex-col gap-[12px] rounded-xl border border-solid border-border bg-bg-surface p-[16px] text-left", className)}
    >
      <div className="flex items-start gap-[8px]">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="m-0 text-md font-semibold leading-md text-text-primary">
            Finish your profile
          </h2>
          <p className="m-0 text-sm leading-sm text-text-secondary">Where did you hear about IDEEZA? One tap.</p>
        </div>
        <IconButton size="sm" aria-label="Close" onClick={() => closeSourceNudge()} icon={<Icon icon={Cancel01Icon} size={16} />} />
      </div>
      <SourcePicker onAnswered={() => undefined} />
    </section>
  );
}
