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
  meal_description?: string;
}

export interface DailyWellness {
  id?: string;
  profile_id?: string;
  date: string;
  notes: string;
  created_at?: string;
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
  description?: string;
  tags: string[];
  image: string;
  ingredients: string[];
  instructions: string;
  micros?: { name: string; value: number; unit: string }[];
  log_count?: number;
}

export interface AgentConfig {
  showGptWidget?: boolean;
  generateImages?: boolean;
  refinePhotos?: boolean;
  artStyle?: string;
  customArtStyle?: string;
  requireConfirmation?: boolean;
  customInstructions?: string;
}

export interface Knowledge {
  preferences: string[];
  health: string[];
  notes: string[];
  patterns: string[];
}

export interface Profile {
  id?: string;
  username: string;
  display_name: string;
  imageUrl?: string;
  description?: string;
  height: number;
  weight: number;
  dob?: string;
  gender?: string;
  preferences: string[];
  
  // Goals
  daily_calories_goal: number;
  weight_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fats_goal: number;
  fiber_goal: number;
  
  // V3.2 Restructured Agent & Knowledge
  knowledge: Knowledge;
  agent_memory: string[];
  agent_config: AgentConfig;
  
  timezone: string;
  api_key: string;
  notionApiKey?: string;
  notionDatabaseId?: string;
  googleSheetsWebhookUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramRemindersEnabled: boolean;
  telegramReportsEnabled: boolean;
  telegramReminderTimes: string[];
}

export interface WeightLog {
  id?: string;
  profile_id?: string;
  weight: number;
  date: string;
  created_at?: string;
}

