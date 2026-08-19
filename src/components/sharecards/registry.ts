import { CardVariation } from "./types";

// Day summary drawers
import { drawCollageCard }         from "./drawCollageCard";
import { drawObsidianCard }        from "./drawObsidianCard";
import { drawEditorialCard }       from "./drawEditorialCard";
import { drawChronoCard }          from "./drawChronoCard";
import { drawSwissMinimalistCard } from "./drawSwissMinimalistCard";

// Meal drawers
import { drawMealObsidianCard }  from "./drawMealObsidianCard";
import { drawMealEditorialCard } from "./drawMealEditorialCard";

// Recipe drawers
import { drawRecipeObsidianCard }  from "./drawRecipeObsidianCard";
import { drawRecipeEditorialCard } from "./drawRecipeEditorialCard";

/** Variations for Daily Summary Card (Portrait 3:4 and Story 9:16) */
export const dayCardVariations: CardVariation[] = [
  { id: "chrono",                 name: "Chrono Dual-Macro (Story)",   format: "story",    draw: drawChronoCard },
  { id: "swiss",                  name: "Swiss Minimalist (3:4)",      format: "portrait", draw: drawSwissMinimalistCard },
  { id: "obsidian",               name: "Dashboard Minimal (Story)",   format: "story",    draw: drawObsidianCard },
  { id: "obsidian_split_circles", name: "Dashboard Rings (Story)",     format: "story",    draw: drawObsidianCard },
  { id: "collage",                name: "Photo Collage (Visual Gallery)", format: "portrait", draw: drawCollageCard },
  { id: "editorial",              name: "Editorial (Light Premium)",   format: "portrait", draw: drawEditorialCard },
];

/** Variations for Meal Card (Square 1:1) */
export const mealCardVariations: CardVariation[] = [
  { id: "obsidian",  name: "Obsidian (Glass Tech)",       format: "square",   draw: drawMealObsidianCard },
  { id: "editorial", name: "Editorial (Light Premium)",     format: "square",   draw: drawMealEditorialCard },
];

/** Variations for Recipe Card (Square 1:1) */
export const recipeCardVariations: CardVariation[] = [
  { id: "obsidian",  name: "Obsidian (Glass Tech)",       format: "square",   draw: drawRecipeObsidianCard },
  { id: "editorial", name: "Editorial (Light Premium)",     format: "square",   draw: drawRecipeEditorialCard },
];
