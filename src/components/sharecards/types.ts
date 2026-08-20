export interface CardDrawContext {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  handleStr: string;
  name: string;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  mealsList: any[];
  mealImages: Record<string, HTMLImageElement>;
  
  // Specific fields for Meal and Recipe cards
  time?: string;
  description?: string;
  ingredients?: string[];
  loadedImg?: HTMLImageElement | null;
  tags?: string[];

  // Profile data & dynamic macro goals
  weight?: number;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFats?: number;
  targetFiber?: number;
  trackedNutrients?: any[];
  currentStreak?: number;
}

export interface CardVariation {
  id: string;
  name: string;
  format: "portrait" | "story" | "square";
  draw: (dc: CardDrawContext) => void;
}
