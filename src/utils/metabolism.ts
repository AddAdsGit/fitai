import type { Meal, WeightLog, Profile } from "../types";

export interface TDEEResult {
  tdee: number;
  isRealAI: boolean;
  loggedDays: number; // logged food days count
  foodLogsCount: number; // total meal entries logged in range
  weightLogsCount: number; // total weight logs in range
  avgIntake: number;
  netDeficitOrSurplus: number; // positive = deficit, negative = surplus
  weightChangeKg: number;
  bmr: number;
  minRequiredFoodDays: number;
  minRequiredWeightLogs: number;
}

/**
 * Calculates Basal Metabolic Rate (BMR) using the Mifflin-St Jeor equation.
 */
export const calculateBMR = (profile: Partial<Profile> | null): number => {
  const weight = profile?.weight || 70;
  const height = profile?.height || 170;
  const gender = (profile?.gender || "male").toLowerCase();
  
  // Calculate approximate age from dob or fallback to 30
  let age = 30;
  if (profile?.dob) {
    try {
      const birthYear = new Date(profile.dob).getFullYear();
      const currentYear = new Date().getFullYear();
      if (!isNaN(birthYear) && birthYear < currentYear) {
        age = currentYear - birthYear;
      }
    } catch (_) {
      age = 30;
    }
  }

  // Mifflin-St Jeor Formula
  if (gender === "female" || gender === "f") {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }
  return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
};

/**
 * Formats a Date object to YYYY-MM-DD string in local time.
 */
const formatDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Calculates high-accuracy Total Daily Energy Expenditure (TDEE).
 * Uses Energy Balance Equation: Real TDEE = Avg Daily Intake - (Weight Change kg * 7700 / Days)
 */
export const calculateTDEE = (
  meals: Meal[] = [],
  weightLogs: WeightLog[] = [],
  dateRange: { start: Date; end: Date },
  profile: Partial<Profile> | null = null
): TDEEResult => {
  const bmr = calculateBMR(profile);

  const startStr = formatDateStr(dateRange.start);
  const endStr = formatDateStr(dateRange.end);

  const minRequiredFoodDays = 4;
  const minRequiredWeightLogs = 4;

  // 1. Filter meals in range and group by date
  const rangeMeals = meals.filter((m) => m.date >= startStr && m.date <= endStr);
  const intakeByDate = new Map<string, number>();

  rangeMeals.forEach((meal) => {
    const current = intakeByDate.get(meal.date) || 0;
    intakeByDate.set(meal.date, current + (meal.calories || 0));
  });

  const loggedDays = intakeByDate.size;
  const foodLogsCount = rangeMeals.length;

  // 2. Filter weight logs in range sorted by date
  const sortedWeights = [...weightLogs]
    .filter((w) => w.date >= startStr && w.date <= endStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  const weightLogsCount = sortedWeights.length;

  // 3. Precise Requirement Check: Need at least 4 logged food days AND at least 4 weight logs
  const isDataSufficient = loggedDays >= minRequiredFoodDays && weightLogsCount >= minRequiredWeightLogs;

  if (!isDataSufficient) {
    // Estimated TDEE baseline (BMR * 1.375 light activity multiplier)
    const estimatedTdee = Math.round(bmr * 1.375);
    const avgIntake = loggedDays > 0
      ? Math.round(Array.from(intakeByDate.values()).reduce((a, b) => a + b, 0) / loggedDays)
      : 0;

    return {
      tdee: estimatedTdee,
      isRealAI: false,
      loggedDays,
      foodLogsCount,
      weightLogsCount,
      avgIntake,
      netDeficitOrSurplus: avgIntake > 0 ? estimatedTdee - avgIntake : 0,
      weightChangeKg: 0,
      bmr,
      minRequiredFoodDays,
      minRequiredWeightLogs,
    };
  }

  // 4. Calculate Total & Avg Intake over logged days
  const totalIntake = Array.from(intakeByDate.values()).reduce((a, b) => a + b, 0);
  const avgIntake = Math.round(totalIntake / loggedDays);

  // 5. Calculate weight trend delta using initial and latest weight in range
  const startWeight = sortedWeights[0].weight;
  const endWeight = sortedWeights[sortedWeights.length - 1].weight;
  const weightChangeKg = parseFloat((endWeight - startWeight).toFixed(2));

  // Days span between first and last weight log (minimum 1 day)
  const startDateObj = new Date(sortedWeights[0].date);
  const endDateObj = new Date(sortedWeights[sortedWeights.length - 1].date);
  const daysDiff = Math.max(1, Math.round((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 3600 * 24)));

  // Daily calorie impact from weight change (7700 kcal per kg)
  const dailyCalorieImpact = (weightChangeKg * 7700) / daysDiff;

  // Real TDEE = Avg Intake - Daily Impact
  const realTdee = Math.round(avgIntake - dailyCalorieImpact);

  // Net Deficit = Real TDEE - Avg Intake
  const netDeficitOrSurplus = realTdee - avgIntake;

  return {
    tdee: Math.max(1000, realTdee), // logical floor
    isRealAI: true,
    loggedDays,
    foodLogsCount,
    weightLogsCount,
    avgIntake,
    netDeficitOrSurplus,
    weightChangeKg,
    bmr,
    minRequiredFoodDays,
    minRequiredWeightLogs,
  };
};
