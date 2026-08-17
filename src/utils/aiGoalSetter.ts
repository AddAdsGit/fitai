export interface UserBodyMetricsInput {
  height?: number; // cm
  weight?: number; // kg
  age?: number;
  gender?: string;
  goal?: string;
  targetWeight?: number;
}

export interface AiGoalResult {
  targetWeight: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  recommendedNutrientsToEnable: string[];
  healthMemoryNote: string;
  summaryReason: string;
}

export function parseAiHealthPrompt(prompt: string, inputMetrics?: UserBodyMetricsInput | number): AiGoalResult {
  const p = prompt.toLowerCase().trim();

  // Extract metrics from object or legacy number
  let weight = 70;
  let height = 170;
  let age = 25;
  let gender = "Male";
  let userGoal = "Maintain Weight";

  if (typeof inputMetrics === "number") {
    weight = inputMetrics > 0 ? inputMetrics : 70;
  } else if (inputMetrics && typeof inputMetrics === "object") {
    if (inputMetrics.weight && inputMetrics.weight > 0) weight = inputMetrics.weight;
    if (inputMetrics.height && inputMetrics.height > 0) height = inputMetrics.height;
    if (inputMetrics.age && inputMetrics.age > 0) age = inputMetrics.age;
    if (inputMetrics.gender) gender = inputMetrics.gender;
    if (inputMetrics.goal) userGoal = inputMetrics.goal;
  }

  // Calculate Ideal BMI Weight (BMI = 22.0)
  const heightM = height / 100;
  const bmiIdeal = Math.round(22 * heightM * heightM);

  // Default AI Target Weight
  let targetWeight = weight > 0 ? weight : bmiIdeal;

  // Check if prompt explicitly mentions a target weight (e.g. "target 65kg", "reach 70 kg", "lose 10kg")
  const explicitWeightMatch = p.match(/(?:target|reach|goal|to)\s*(\d{2,3})\s*(?:kg|kilos|lbs)?/i) || p.match(/(\d{2,3})\s*(?:kg|kilos|lbs)/i);
  if (explicitWeightMatch && explicitWeightMatch[1]) {
    const parsedW = parseInt(explicitWeightMatch[1], 10);
    if (parsedW >= 30 && parsedW <= 250) {
      targetWeight = parsedW;
    }
  }

  // Mifflin-St Jeor BMR calculation
  let bmr = 10 * weight + 6.25 * height - 5 * age + (gender === "Male" ? 5 : -161);
  let tdee = Math.round(bmr * 1.45);

  let calories = 2000;
  let protein = 150;
  let carbs = 150;
  let fats = 60;
  let fiber = 30;
  const enableNutrients: string[] = ["protein", "carbs", "fats", "fiber"];
  let healthMemoryNote = "";
  let summaryReason = "";

  if (p.includes("thyroid") || p.includes("hypothyroid") || p.includes("hashimoto")) {
    targetWeight = weight > bmiIdeal ? bmiIdeal : Math.max(30, weight - 5);
    calories = Math.max(1200, Math.round(tdee - 400));
    protein = Math.max(130, Math.round(weight * 2.0));
    carbs = 120;
    fats = 55;
    fiber = 35;
    enableNutrients.push("iron", "zinc", "selenium", "vit_d");
    healthMemoryNote = `Health Condition: Thyroid / Hypothyroidism management. Focus on high protein, selenium, zinc, and high fiber.`;
    summaryReason = `Configured for Thyroid support & Weight Loss (Target: ${targetWeight}kg, High protein, Selenium & Zinc, High fiber).`;
  } else if (p.includes("diabet") || p.includes("sugar") || p.includes("glucose") || p.includes("insulin")) {
    targetWeight = weight > bmiIdeal ? bmiIdeal : weight;
    calories = Math.max(1300, Math.round(tdee - 300));
    protein = Math.max(120, Math.round(weight * 1.8));
    carbs = 100;
    fats = 65;
    fiber = 35;
    enableNutrients.push("sugar", "sodium", "potassium");
    healthMemoryNote = `Health Condition: Diabetes / Blood Sugar Management. Target low added sugar, high fiber.`;
    summaryReason = `Configured for Diabetes & Blood sugar control (Target: ${targetWeight}kg, Low added sugar, high fiber).`;
  } else if (p.includes("keto") || p.includes("low carb")) {
    targetWeight = weight > bmiIdeal ? bmiIdeal : weight;
    calories = Math.max(1400, Math.round(tdee - 350));
    protein = Math.max(130, Math.round(weight * 2.0));
    carbs = 25;
    fats = Math.round((calories - (protein * 4 + carbs * 4)) / 9);
    fiber = 25;
    enableNutrients.push("sodium", "potassium", "magnesium");
    healthMemoryNote = `Dietary Protocol: Ketogenic / Low-carb (<25g carbs daily).`;
    summaryReason = `Configured for Keto protocol (<25g net carbs, healthy fats & electrolytes).`;
  } else if (p.includes("marathon") || p.includes("endurance") || p.includes("runner") || p.includes("cycling")) {
    targetWeight = weight;
    calories = Math.round(tdee + 350);
    protein = Math.max(140, Math.round(weight * 1.8));
    carbs = Math.max(250, Math.round(weight * 4.0));
    fats = 65;
    fiber = 35;
    enableNutrients.push("sodium", "potassium", "vit_c");
    healthMemoryNote = `Fitness Focus: Endurance athletic training & carbohydrate loading.`;
    summaryReason = `Configured for endurance performance (High carbs & electrolyte replenishment).`;
  } else if (p.includes("muscle") || p.includes("hypertrophy") || p.includes("bodybuilding") || p.includes("bulk")) {
    targetWeight = weight > bmiIdeal + 3 ? weight : Math.round(weight * 1.03);
    calories = weight > bmiIdeal + 3 ? Math.round(tdee - 150) : Math.round(tdee + 250);
    protein = Math.max(160, Math.round(weight * 2.2));
    carbs = 220;
    fats = 70;
    fiber = 30;
    enableNutrients.push("iron", "zinc");
    healthMemoryNote = `Fitness Focus: Muscle hypertrophy & lean mass building.`;
    summaryReason = `Configured for muscle growth & body recomposition (Target: ${targetWeight}kg, High protein target).`;
  } else if (p.includes("pressure") || p.includes("hypertension") || p.includes("heart") || p.includes("cardio")) {
    targetWeight = weight > bmiIdeal ? bmiIdeal : weight;
    calories = Math.max(1350, Math.round(tdee - 250));
    protein = Math.max(120, Math.round(weight * 1.6));
    carbs = 180;
    fats = 55;
    fiber = 35;
    enableNutrients.push("sodium", "potassium", "magnesium");
    healthMemoryNote = `Health Condition: Hypertension / Heart health. Sodium limit <1500mg, rich potassium.`;
    summaryReason = `Configured for heart health & low sodium (<1500mg sodium, high potassium).`;
  } else {
    if (userGoal === "Lose Weight" || p.includes("lose") || p.includes("fat")) {
      targetWeight = weight > bmiIdeal ? bmiIdeal : Math.max(30, weight - 4);
      calories = Math.max(1300, Math.round(tdee - 400));
    } else if (userGoal === "Build Muscle" || p.includes("gain")) {
      targetWeight = weight > bmiIdeal + 3 ? weight : Math.round(weight * 1.03);
      calories = weight > bmiIdeal + 3 ? Math.round(tdee - 150) : Math.round(tdee + 250);
    } else {
      targetWeight = weight;
      calories = tdee;
    }

    protein = Math.max(130, Math.round(weight * 1.8));
    carbs = Math.max(120, Math.round((calories * 0.4) / 4));
    fats = Math.max(50, Math.round((calories * 0.25) / 9));
    fiber = 30;
    enableNutrients.push("vit_d", "vit_c");
    healthMemoryNote = `User Goal Note: ${prompt}`;
    summaryReason = `Optimized nutrition targets (Target: ${targetWeight}kg, ${calories} kcal, ${protein}g protein).`;
  }

  return {
    targetWeight,
    calories,
    protein,
    carbs,
    fats,
    fiber,
    recommendedNutrientsToEnable: Array.from(new Set(enableNutrients)),
    healthMemoryNote,
    summaryReason,
  };
}
