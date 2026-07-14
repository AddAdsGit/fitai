import React, { useEffect } from "react";
import { MealShareModal } from "./components/MealShareModal";
import { RecipeShareModal } from "./components/RecipeShareModal";
import { DayShareModal } from "./components/DayShareModal";

const mockMeal = {
  name: "Avocado Sourdough Toast & Eggs",
  calories: 450,
  protein: 24,
  carbs: 38,
  fats: 22,
  fiber: 6,
  time: "08:30 AM",
  image: "/images/omelette.jpg"
};

const mockRecipe = {
  name: "Crispy Golden Masala Dosa",
  calories: 380,
  protein: 12,
  carbs: 64,
  fats: 8,
  fiber: 4,
  prep_time: "25 min",
  image: "/images/dosa.jpg",
  ingredients: [
    "2 cups Rice and Urad Dal Batter",
    "3 Potatoes (boiled & mashed)",
    "1 Onion (finely chopped)",
    "1/2 tsp Mustard seeds",
    "Curry leaves & Green chilies",
    "Ghee or Butter for roasting"
  ]
};

const mockDay = {
  name: "Sunday Fitness Fuel",
  date: "2026-07-14",
  calories: 1850,
  protein: 120,
  carbs: 210,
  fats: 55,
  fiber: 28,
  meals: [
    { name: "Avocado Toast & Eggs", calories: 450, time: "08:30 AM", protein: 24, carbs: 38, fats: 22, fiber: 6, tags: ["healthy-fats", "breakfast"] },
    { name: "Whey Protein Shake", calories: 220, time: "11:30 AM", protein: 30, carbs: 5, fats: 3, fiber: 1, tags: ["high-protein", "post-workout"] },
    { name: "Chicken Masala Dosa", calories: 580, time: "01:30 PM", protein: 28, carbs: 68, fats: 18, fiber: 4, tags: ["high-carb", "local-delight"] },
    { name: "Greek Yogurt & Berries", calories: 180, time: "05:00 PM", protein: 15, carbs: 18, fats: 4, fiber: 3, tags: ["healthy-snacks"] },
    { name: "Grilled Salmon & Veggies", calories: 420, time: "08:00 PM", protein: 38, carbs: 12, fats: 20, fiber: 5, tags: ["healthy-fats", "high-protein"] },
    { name: "Post-Workout Casein", calories: 150, time: "10:30 PM", protein: 24, carbs: 2, fats: 1, fiber: 0, tags: ["bedtime-protein"] }
  ]
};

const mockProfile = {
  username: "mk_super_long_developer_designer_username_12345",
  weight: 78.5
};

interface TestCardRunnerProps {
  type: "meal" | "recipe" | "day";
  format: "square" | "portrait" | "story";
}

export const TestCardRunner: React.FC<TestCardRunnerProps> = ({ type, format }) => {
  useEffect(() => {
    // Inject full-bleed styles to make canvas occupy the entire screen
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      body { margin: 0; padding: 0; background: #000; overflow: hidden; }
      #root { width: 100vw; height: 100vh; }
      
      /* Hide modal backdrop overlay */
      div[class*="bg-stone-900/60"], div[class*="backdrop-blur-sm"] {
        background: transparent !important;
        backdrop-filter: none !important;
        position: static !important;
        display: block !important;
        padding: 0 !important;
      }
      
      /* Hide modal container frame, header, navigation, copy/download buttons */
      div[class*="bg-stone-50"] {
        max-width: none !important;
        max-height: none !important;
        width: 100vw !important;
        height: 100vh !important;
        padding: 0 !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
        display: block !important;
        overflow: hidden !important;
      }
      
      /* Hide all non-canvas wrapper children of modal */
      div[class*="bg-stone-50"] > div:not([class*="relative"]) {
        display: none !important;
      }
      div[class*="bg-stone-50"] > span {
        display: none !important;
      }
      
      /* Force canvas/card container to cover viewport */
      div[class*="bg-stone-50"] > div[class*="relative"] {
        width: 100vw !important;
        height: 100vh !important;
        aspect-ratio: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        border-radius: 0 !important;
        background: transparent !important;
        display: block !important;
        overflow: visible !important;
      }
      div[class*="bg-stone-50"] > div[class*="relative"] > div {
        width: 100vw !important;
        height: 100vh !important;
        border: none !important;
        border-radius: 0 !important;
        background: transparent !important;
        transform: none !important;
        overflow: visible !important;
      }
      
      /* Stretch canvas to fill screen */
      canvas {
        width: 100vw !important;
        height: 100vh !important;
        max-width: none !important;
        max-height: none !important;
        border-radius: 0 !important;
      }

      /* Force HTML card to render at full resolution on the test page */
      #obsidian-card-capture {
        transform: scale(2.76923) !important;
        transform-origin: top left !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 390px !important;
        height: 693.3px !important;
        z-index: 99999 !important;
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
      {type === "meal" && (
        <MealShareModal
          item={mockMeal}
          profileData={mockProfile}
          onClose={() => {}}
          triggerToast={() => {}}
        />
      )}
      {type === "recipe" && (
        <RecipeShareModal
          item={mockRecipe}
          profileData={mockProfile}
          onClose={() => {}}
          triggerToast={() => {}}
        />
      )}
      {type === "day" && (
        <DayShareModal
          item={mockDay}
          profileData={mockProfile}
          onClose={() => {}}
          triggerToast={() => {}}
        />
      )}
    </div>
  );
};
