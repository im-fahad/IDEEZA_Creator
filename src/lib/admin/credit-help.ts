// What every column, AI service, group and quality level on the admin's AI
// credit pricing means, for the info tips beside their names (owner,
// 2026-11-11: "add info icon and tooltip in all table headers and names, user
// will clearly know whats this for, and what is this"). One or two plain
// sentences each: what it is, then what it does to the price.
//
// Pure, relative imports only, so node:test can check every service and level
// has its tip.

import type { QualityLevel, ServiceGroup } from "./credit-pricing";

/** Each AI service, by its backend `service_key`: what a maker gets when it runs. */
export const SERVICE_HELP: Record<string, string> = {
  ai_image_generation: "Concept images of a maker's idea, made by AI from their prompt. Charged each time it runs.",
  product_image_generation: "The picture of the finished product, made by AI from the maker's design. Charged each time it runs.",
  ai_threed_generation: "A 3D model of the product, made by AI. Charged each time it runs.",
  ai_freerouting: "Draws the copper traces that connect the parts on a circuit board, automatically.",
  placement_v2: "Places the parts on a circuit board automatically, before the traces are drawn.",
  ai_part_creation: "Makes a new part for the parts library from a manufacturer part number (MPN) the maker enters.",
  ai_schematic_edit: "A change a maker asks for in words, made by AI to the schematic of a design that's already built.",
  ai_pcb_edit: "A change a maker asks for in words, made by AI to the circuit board of a design that's already built.",
  ai_3d_edit: "A change a maker asks for in words, made by AI to the 3D model of a design that's already built.",
  ai_full_edit: "One change, asked for in words, that AI makes across the schematic, the circuit board and the 3D model together.",
  ai_video: "A short video that shows off the product, made by AI.",
  ai_audio_merge: "Adds an audio track, such as music or a voice-over, to a product video.",
  ai_apk_config_generation: "The settings file for the product's Android app (APK), written by AI.",
  ai_patent: "A patent draft for the product, written by AI.",
  ai_business_plan: "A business plan for the product, written by AI.",
  ai_product_creation:
    "A whole product built by AI from a maker's prompt. Builds are priced by quality level (below); this price is used only for a level with no price.",
  ai_agentic_product_creation:
    "A product built by the AI agent, which works through the build step by step. Like the AI product build, a quality level's price comes first.",
};

/** Each group of services in the AI services table. */
export const GROUP_HELP: Record<ServiceGroup, string> = {
  images: "Pictures made by AI: an idea's concept images and the finished product's picture.",
  "3d": "3D models of the product, made by AI.",
  pcb: "AI work on the circuit board: placing the parts and drawing the traces between them.",
  parts: "New parts for the parts library, made by AI.",
  edits: "Changes a maker asks for in words, after the product is built.",
  media: "Video and sound that show off the product.",
  documents: "Documents and files about the product, written by AI.",
  build: "Building a whole product. A build is priced by the quality level the maker picks; these prices are the fallback.",
};

/** Each product build quality level. */
export const LEVEL_HELP: Record<QualityLevel, string> = {
  free: "The free build: makers pay nothing and we pay the cost. Its daily limit keeps that cost in check.",
  low: "The quickest build, with less detail.",
  medium: "A balance of detail and speed.",
  high: "More detail, and it takes longer.",
  max: "The best a build can be, at the highest cost. No plan offers it yet.",
};

/** The AI services and build quality price tables' columns. */
export function priceColumnHelp(unit: "run" | "build") {
  return {
    name:
      unit === "run"
        ? "Something a maker asks the AI to do. Each is charged in credits every time it runs."
        : "The build quality a maker picks when building a product. Each level has its own price in credits.",
    cost:
      unit === "run"
        ? "What one run costs us, in US dollars: what the AI provider charges plus our servers. The credits are worked out from it."
        : "What one build at this level costs us, in US dollars. The credits are worked out from it.",
    markup:
      "How much to add on top of our cost, as a percent of the cost: 50% makes a $1.00 run cost the maker $1.50. Leave it empty to use the markup set above.",
    current: "What makers are charged today, in credits: the price from the last publish.",
    calculated:
      "What makers will be charged once you publish: our cost plus the markup, turned into credits and rounded up.",
    makerPays: "What those credits cost a maker at the list price of a credit, with no discount and no pack bonus.",
    revenue:
      "What we actually get for those credits when the maker bought them at the lowest price: the biggest discount and the biggest pack bonus.",
    profit:
      "Revenue at the lowest price minus our cost, in dollars and as a percent of the cost. The worst case: every other maker earns us more.",
    status:
      "On target: earns at least its markup at the lowest price. Below target: earns less than its markup. Loses money: earns less than it costs us. No cost yet: keeps its current credits.",
  };
}

/** The quality levels' availability table. */
export const ACCESS_COLUMN_HELP = {
  level: "The build quality a maker picks when building a product.",
  offered: "On: makers can pick this level when they build. Off: they can't, and its price is kept for when it's back on.",
  dailyLimit: "How many builds at this level one maker can start in a day. 0 means no limit.",
  change: "What this level is today, and what it becomes once you publish.",
};

/** The credit packs table. */
export const PACK_COLUMN_HELP = {
  name: "The name makers see on the pack. Change it with Edit in the pack's ⋮ menu.",
  popular: "Marks one pack as Most popular for makers. Click a star to move the mark; click it again to clear it.",
  price: "What the maker pays for the pack, in US dollars.",
  base: "The credits the price buys at the list price of a credit, rounded down to the step below.",
  bonus: "Extra credits on top, a percent of the base set by the pack's price (see Bonus by pack price).",
  total: "Base plus bonus: the credits the maker gets.",
  perCredit: "The pack's price divided by its total credits, and how much under the list price that is.",
  shown: "On: makers can buy this pack. Off: it stays here but makers don't see it.",
};

/** The bonus tiers table. */
export const TIER_COLUMN_HELP = {
  from: "The lowest pack price this tier starts at. A pack gets the bonus of the highest tier its price reaches.",
  bonus: "The bonus, as a percent of the pack's base credits. No more than the maximum pack bonus.",
};

/** The Publish dialog's table of changes. */
export const CHANGE_COLUMN_HELP = {
  price: "What changes when you publish: a price, a setting or a pack.",
  current: "What makers have today.",
  next: "What makers get once you publish.",
};
