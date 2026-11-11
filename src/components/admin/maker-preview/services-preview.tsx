// Maker preview › AI services: what each AI service costs a maker, in the
// price badge the maker sees on the button that runs it
// (components/credits/credit-badge.tsx), grouped as the admin's table is.
// Product builds aren't here: a maker's build is priced by its quality level.

import * as React from "react";
import { CreditBadge } from "@/components/credits/credit-badge";
import type { MakerView } from "@/lib/admin/maker-view";
import { Section } from "../credit-pricing/fields";
import { AdminNote, PreviewFrame } from "./preview-frame";

export function ServicesPreview({ view }: { view: MakerView }) {
  return (
    <Section
      title="AI services"
      description="Makers see an AI service's price on the button that runs it, in the same badge as the Build button's. Each run is charged."
    >
      <PreviewFrame where="The price on each AI action's button">
        <div className="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-2">
          {view.groups.map((g) => (
            <section key={g.id} aria-label={g.label} className="flex min-w-0 flex-col gap-4">
              <h3 className="m-0 text-md font-semibold leading-md text-text-primary">{g.label}</h3>
              <ul className="m-0 flex list-none flex-col gap-[6px] p-0">
                {g.services.map((s) => (
                  <li key={s.key} className="flex items-center justify-between gap-4 rounded-lg bg-bg-subtle px-[12px] py-[8px]">
                    <span className="min-w-0 text-md leading-md text-text-primary">{s.label}</span>
                    <CreditBadge credits={s.credits} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </PreviewFrame>
      <AdminNote>Product builds aren&apos;t listed here: makers pay the price of the quality level they pick, above.</AdminNote>
    </Section>
  );
}
