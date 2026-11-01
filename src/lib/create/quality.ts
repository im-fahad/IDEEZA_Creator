// Quality, picked on Home beside the prompt (owner, 2026-11-01): how much
// work every concept render in that chat gets. It is chosen once, with the
// idea, and the chat keeps it, so the first draft, its companions, each
// refine and each regenerate all come out at the level the maker asked for.
//
// Safe for the browser and the server alike: the composer reads the labels,
// the render route reads the numbers.

export type RenderQuality = "low" | "medium" | "high";

export const QUALITIES: RenderQuality[] = ["low", "medium", "high"];

/** What every render got before there was a choice. */
export const DEFAULT_QUALITY: RenderQuality = "medium";

export const QUALITY_INFO: Record<RenderQuality, { label: string; hint: string }> = {
  low: { label: "Low", hint: "Quickest draft, less detail" },
  medium: { label: "Medium", hint: "Balanced detail and speed" },
  high: { label: "High", hint: "Most detail, takes longer" },
};

/** Anything stored or sent that is not a level reads as Medium — a chat
 *  from before the choice existed renders exactly as it always did. */
export function cleanQuality(v: unknown): RenderQuality {
  return v === "low" || v === "medium" || v === "high" ? v : DEFAULT_QUALITY;
}

/** Sampling steps on the AI Horde. Medium is the 25 every render had. High
 *  stays under 50: past that the horde wants kudos up front, which the
 *  shared anonymous key does not have. */
export const HORDE_STEPS: Record<RenderQuality, number> = { low: 12, medium: 25, high: 40 };

/** Image size on Pollinations, 4:3 like the card. Medium is the size every
 *  render had; the horde cannot go bigger for an anonymous caller, so there
 *  only the steps change. */
export const POLLINATIONS_SIZE: Record<RenderQuality, { width: number; height: number }> = {
  low: { width: 512, height: 384 },
  medium: { width: 640, height: 480 },
  high: { width: 1024, height: 768 },
};
