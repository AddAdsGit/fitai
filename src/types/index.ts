export interface Meal {
  id: string;
  name: string;
  time: string;
  type: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  image: string;
  date: string;
  fiber?: number;
  notes?: string;
}

export interface Recipe {
  id: string;
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  tags: string[];
  image: string;
  ingredients: string[];
  instructions: string;
  micros?: { name: string; value: number; unit: string }[];
}
