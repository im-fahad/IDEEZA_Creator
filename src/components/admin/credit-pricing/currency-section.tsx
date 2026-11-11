// What one credit is worth: the dollar price the admin sets, and USDT and IDZ,
// which follow it unless set by hand. USDT is a dollar coin, so it follows the
// dollar one for one; IDZ follows the IDZ price. Setting either by hand is
// there for a coin that has drifted from its price, and says so.

import * as React from "react";
import { Toggle } from "@/components/ideeza/toggle";
import {
  creditsPerUnit,
  formatCoin,
  formatUsd,
  type PricingSettings,
  type PublishedPrices,
  type Rates,
  type SettingsErrors,
} from "@/lib/admin/credit-pricing";
import { AmountField, Section, TodayNext } from "./fields";

type Change = (patch: Partial<PricingSettings>) => void;

function CurrencyCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-6 rounded-lg border border-solid border-border p-8">
      <h3 className="m-0 text-lg font-semibold leading-lg text-text-primary">{title}</h3>
      {children}
    </div>
  );
}

function AutoToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-md leading-md text-text-primary">{label}</span>
      <Toggle size="sm" checked={checked} onChange={onChange} aria-label={label} />
    </div>
  );
}

export function CurrencySection({
  settings,
  errors,
  rates,
  published,
  onChange,
}: {
  settings: PricingSettings;
  errors: SettingsErrors;
  rates: Rates | null;
  published: PublishedPrices;
  onChange: Change;
}) {
  return (
    <Section
      title="What a credit is worth"
      description="Set the dollar price of one credit. USDT and IDZ follow it, so the three never drift apart. Turn either off only to set it by hand."
    >
      <div className="grid grid-cols-1 gap-8 [@container(min-width:900px)]:grid-cols-3">
        <CurrencyCard title="US dollars">
          <AmountField
            label="1 credit in US dollars"
            prefix="$"
            value={settings.creditUsd}
            onValueChange={(creditUsd) => onChange({ creditUsd })}
            error={errors.creditUsd}
            hint={rates ? `$1 buys ${creditsPerUnit(rates.creditUsd)} credits` : undefined}
          />
          <TodayNext today={formatUsd(published.creditUsd)} next={rates ? formatUsd(rates.creditUsd) : null} />
        </CurrencyCard>

        <CurrencyCard title="USDT">
          <AutoToggle label="Follow the dollar" checked={settings.usdtAuto} onChange={() => onChange({ usdtAuto: !settings.usdtAuto })} />
          {settings.usdtAuto ? (
            <p className="m-0 text-sm leading-sm text-text-tertiary">
              1 USDT is $1, so 1 credit costs as many USDT as dollars. Recommended.
            </p>
          ) : (
            <AmountField
              label="1 credit in USDT"
              suffix="USDT"
              value={settings.usdtPerCredit}
              onValueChange={(usdtPerCredit) => onChange({ usdtPerCredit })}
              error={errors.usdtPerCredit}
              hint="Set by hand: it no longer follows the dollar price."
            />
          )}
          <TodayNext today={formatCoin(published.usdtPerCredit, "USDT")} next={rates ? formatCoin(rates.usdtPerCredit, "USDT") : null} />
        </CurrencyCard>

        <CurrencyCard title="IDZ">
          <AutoToggle label="Follow the IDZ price" checked={settings.idzAuto} onChange={() => onChange({ idzAuto: !settings.idzAuto })} />
          {settings.idzAuto ? (
            <AmountField
              label="1 IDZ in US dollars"
              prefix="$"
              value={settings.idzUsd}
              onValueChange={(idzUsd) => onChange({ idzUsd })}
              error={errors.idzUsd}
              hint="The token's price. A live feed can fill this later; for now it is typed."
            />
          ) : (
            <AmountField
              label="1 credit in IDZ"
              suffix="IDZ"
              value={settings.idzPerCredit}
              onValueChange={(idzPerCredit) => onChange({ idzPerCredit })}
              error={errors.idzPerCredit}
              hint="Set by hand: it no longer follows the IDZ price."
            />
          )}
          <TodayNext today={formatCoin(published.idzPerCredit, "IDZ")} next={rates ? formatCoin(rates.idzPerCredit, "IDZ") : null} />
        </CurrencyCard>
      </div>
    </Section>
  );
}
