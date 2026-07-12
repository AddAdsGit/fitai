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
  calories: 1850,
  protein: 120,
  carbs: 210,
  fats: 55,
  fiber: 28,
  meals: [
    { name: "Avocado Toast & Eggs", calories: 450, time: "08:30 AM" },
    { name: "Whey Protein Shake", calories: 220, time: "11:30 AM" },
    { name: "Chicken Masala Dosa", calories: 580, time: "01:30 PM" },
    { name: "Greek Yogurt & Berries", calories: 180, time: "05:00 PM" },
    { name: "Grilled Salmon & Veggies", calories: 420, time: "08:00 PM" }
  ]
};

const mockProfile = {
  username: "fitcoder"
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
      
      /* Force canvas container to cover viewport */
      div[class*="relative"][class*="aspect-square"] {
        width: 100vw !important;
        height: 100vh !important;
        aspect-ratio: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        border-radius: 0 !important;
        background: transparent !important;
        display: block !important;
      }
      div[class*="relative"][class*="aspect-square"] > div {
        width: 100vw !important;
        height: 100vh !important;
        border: none !important;
        border-radius: 0 !important;
        background: transparent !important;
        transform: none !important;
      }
      
      /* Stretch canvas to fill screen */
      canvas {
        width: 100vw !important;
        height: 100vh !important;
        max-width: none !important;
        max-height: none !important;
        border-radius: 0 !important;
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
