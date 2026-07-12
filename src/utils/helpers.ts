// Utility: Check if a meal/recipe image is ungenerated / uses fallback placeholder
export const hasNoGeneratedImage = (imagePath?: string): boolean => {
  if (!imagePath) return true;
  const path = String(imagePath).trim();
  if (path === "" || path === "null" || path === "undefined") return true;
  if (path.includes("source.unsplash.com")) return true;
  return path.includes("photo-1546069901-ba9599a7e63c");
};

// Utility: format a Date object to YYYY-MM-DD string
export const formatDateStr = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Utility: copy text to clipboard with a toast label
export const copyToClipboard = async (text: string, label = "Text") => {
  try {
    await navigator.clipboard.writeText(text);
    return `✅ ${label} copied!`;
  } catch {
    return `❌ Failed to copy ${label}`;
  }
};

// Utility: Get a matching food/drink emoji based on meal name and type
export const getMealEmoji = (name: string, type?: string): string => {
  const lowerName = name.toLowerCase().trim();
  const lowerType = type?.toLowerCase().trim() || "";

  // 1. Drinks / Liquids
  if (
    lowerName.includes("coffee") ||
    lowerName.includes("espresso") ||
    lowerName.includes("latte") ||
    lowerName.includes("cappuccino") ||
    lowerName.includes("macchiato")
  ) {
    return "☕";
  }
  if (
    lowerName.includes("tea") ||
    lowerName.includes("chai") ||
    lowerName.includes("matcha")
  ) {
    return "🍵";
  }
  if (
    lowerName.includes("water") ||
    lowerName.includes("shake") ||
    lowerName.includes("smoothie") ||
    lowerName.includes("juice") ||
    lowerName.includes("soda") ||
    lowerName.includes("coke") ||
    lowerName.includes("drink") ||
    lowerName.includes("milk") ||
    lowerType === "drink"
  ) {
    return "🥤";
  }

  // 2. Specific food items
  if (lowerName.includes("salad") || lowerName.includes("bowl")) {
    return "🥗";
  }
  if (lowerName.includes("egg") || lowerName.includes("omelette") || lowerName.includes("scramble")) {
    return "🍳";
  }
  if (lowerName.includes("toast") || lowerName.includes("bread") || lowerName.includes("sandwich")) {
    return "🍞";
  }
  if (lowerName.includes("pancake") || lowerName.includes("waffle") || lowerName.includes("crepe")) {
    return "🥞";
  }
  if (lowerName.includes("oat") || lowerName.includes("cereal") || lowerName.includes("porridge")) {
    return "🥣";
  }
  if (lowerName.includes("burger") || lowerName.includes("slider")) {
    return "🍔";
  }
  if (lowerName.includes("pizza") || lowerName.includes("slice")) {
    return "🍕";
  }
  if (lowerName.includes("taco")) {
    return "🌮";
  }
  if (lowerName.includes("burrito") || lowerName.includes("wrap")) {
    return "🌯";
  }
  if (lowerName.includes("sushi") || lowerName.includes("sashimi")) {
    return "🍣";
  }
  if (lowerName.includes("rice") || lowerName.includes("biryani")) {
    return "🍚";
  }
  if (lowerName.includes("noodle") || lowerName.includes("pasta") || lowerName.includes("spaghetti")) {
    return "🍝";
  }
  if (lowerName.includes("soup") || lowerName.includes("stew") || lowerName.includes("curry")) {
    return "🍲";
  }
  if (lowerName.includes("chicken") || lowerName.includes("poultry") || lowerName.includes("wings")) {
    return "🍗";
  }
  if (lowerName.includes("steak") || lowerName.includes("beef") || lowerName.includes("meat")) {
    return "🥩";
  }
  if (lowerName.includes("fish") || lowerName.includes("salmon") || lowerName.includes("tuna") || lowerName.includes("seafood")) {
    return "🐟";
  }
  if (
    lowerName.includes("apple") ||
    lowerName.includes("banana") ||
    lowerName.includes("berry") ||
    lowerName.includes("strawberry") ||
    lowerName.includes("blueberry") ||
    lowerName.includes("grape") ||
    lowerName.includes("orange") ||
    lowerName.includes("fruit")
  ) {
    return "🍎";
  }
  if (lowerName.includes("cookie") || lowerName.includes("biscuit") || lowerName.includes("cake") || lowerName.includes("dessert") || lowerName.includes("sweet")) {
    return "🍪";
  }
  if (lowerName.includes("nut") || lowerName.includes("almond") || lowerName.includes("peanut")) {
    return "🥜";
  }
  if (lowerName.includes("cheese")) {
    return "🧀";
  }
  if (lowerName.includes("avocado") || lowerName.includes("guac")) {
    return "🥑";
  }

  // 3. Fallbacks based on meal type / time category
  if (lowerType === "breakfast") {
    return "🍳";
  }
  if (lowerType === "snack") {
    return "🍎";
  }
  
  // Default plate / dining utensil
  return "🍽️";
};

