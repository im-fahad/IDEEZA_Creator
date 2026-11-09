"use client";

// Help and Support (/m/help; mobile Figma "Faq and Contact Support" ›
// FAQs): search, the questions as an accordion (lib/support/faq.ts — what
// the app really does, in the web's words), each answer with the screen that
// does it, and the ways on: Contact support (the top bar's button), Report
// a problem and Tutorials. `?q=` keeps the search in the address.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown01Icon, ArrowRight01Icon, ArrowUp01Icon, BubbleChatQuestionIcon, Bug01Icon, Mortarboard02Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { SearchInput } from "@/components/ideeza/search-input";
import { StateCard } from "@/components/ideeza/state-card";
import { FAQS, searchFaqs } from "@/lib/support/faq";
import { cn } from "@/lib/utils";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";

export function FaqScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = React.useState(() => params.get("q") ?? "");
  const [open, setOpen] = React.useState<string | null>(null);
  const shown = searchFaqs(FAQS, query);

  const type = (v: string) => {
    setQuery(v);
    router.replace(v.trim() ? `/m/help?q=${encodeURIComponent(v)}` : "/m/help", { scroll: false });
  };

  return (
    <Screen top={<TopBar back title="FAQs" actions={[{ icon: BubbleChatQuestionIcon, label: "Contact support", onClick: () => router.push("/m/help/contact") }]} />} className="px-8 pb-12 pt-4">
      <div className="flex flex-col gap-8">
        <SearchInput aria-label="Search the questions" placeholder="Enter a search term here" value={query} onValueChange={type} onClear={() => type("")} />
        {shown.length === 0 ? (
          <StateCard
            tone="empty"
            className="w-full"
            icon={<Icon icon={Search01Icon} size={24} />}
            title={`Nothing about “${query.trim()}”`}
            body="Try other words, or ask us: Contact support reaches the IDEEZA team."
            action={
              <Button hierarchy="secondary" size="lg" onClick={() => type("")}>
                Clear search
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle border-y-[length:var(--border-width-1)] border-solid border-border-subtle">
            {shown.map((f) => {
              const on = open === f.id || (query.trim() !== "" && shown.length === 1);
              return (
                <li key={f.id}>
                  <h2>
                    <button
                      type="button"
                      aria-expanded={on}
                      aria-controls={`faq-${f.id}`}
                      onClick={() => setOpen(on ? null : f.id)}
                      className="flex min-h-[56px] w-full items-center justify-between gap-6 py-5 text-left text-md leading-md text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      {f.q}
                      <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
                        <Icon icon={on ? ArrowUp01Icon : ArrowDown01Icon} size={18} />
                      </span>
                    </button>
                  </h2>
                  {on && (
                    <div id={`faq-${f.id}`} className="flex flex-col items-start gap-4 pb-6">
                      <p className="text-sm leading-sm text-text-secondary">{f.a}</p>
                      {f.link && (
                        <Link href={f.link.href} className="inline-flex min-h-[32px] items-center gap-2 text-sm font-medium leading-sm text-text-brand hover:underline">
                          {f.link.label}
                          <Icon icon={ArrowRight01Icon} size={14} />
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <section aria-labelledby="more-help" className="flex flex-col gap-4">
          <h2 id="more-help" className="text-xl font-medium leading-xl text-text-primary">
            Still need help?
          </h2>
          <HelpRow icon={BubbleChatQuestionIcon} label="Contact support" line="Write to the IDEEZA team" href="/m/help/contact" />
          <HelpRow icon={Bug01Icon} label="Report a problem" line="Something broken, slow or confusing" href="/m/help/report" />
          <HelpRow icon={Mortarboard02Icon} label="Tutorials" line="Learn IDEEZA step by step" href="/m/tutorials" />
        </section>
      </div>
    </Screen>
  );
}

function HelpRow({ icon, label, line, href }: { icon: IconValue; label: string; line: string; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[64px] items-center gap-5 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface px-6 outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
      )}
    >
      <span aria-hidden className="text-text-brand">
        <Icon icon={icon} size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-md font-medium leading-md text-text-primary">{label}</span>
        <span className="text-sm leading-sm text-text-secondary">{line}</span>
      </span>
      <Icon icon={ArrowRight01Icon} size={16} />
    </Link>
  );
}
