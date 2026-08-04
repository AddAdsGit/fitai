export interface Meal {
  id: string;
  name: string;
  time: string;
  type: string;
  calories: number;
  protein: number;
  carbs?: number;
  fats?: number;
  image: string;
  date: string;
  fiber?: number;
  tags?: string[];
  meal_description?: string;
  nutrients?: Record<string, number>;
}

export interface WaterLogItem {
  id: string;
  amount: number;
  time: string;
}

export interface StoolLogItem {
  id: string;
  type: number;
  time: string;
}

export interface EnergyLogItem {
  id: string;
  level: number;
  time: string;
}

export interface DailyWellness {
  id?: string;
  profile_id?: string;
  date: string;
  notes: string;
  water_intake?: number;
  stool_type?: number | null;
  stool_size?: string | null;
  energy_level?: number | null;
  weight_log_time?: string | null;
  water_log_time?: string | null;
  stool_log_time?: string | null;
  energy_log_time?: string | null;
  water_logs?: WaterLogItem[];
  stool_logs?: StoolLogItem[];
  energy_logs?: EnergyLogItem[];
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

export interface TrackingTag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface AgentConfig {
  showGptWidget?: boolean;
  generateImages?: boolean;
  refinePhotos?: boolean;
  artStyle?: string;
  customArtStyle?: string;
  requireConfirmation?: boolean;
  trackWeight?: boolean;
  trackWater?: boolean;
  trackDigestion?: boolean;
  trackEnergy?: boolean;
  customInstructions?: string;
}

export interface Knowledge {
  preferences: string[];
  health: string[];
  notes: string[];
  patterns: string[];
}

export interface TrackedNutrient {
  id: string;
  name: string;
  target: number;
  unit: string;
  color: string;
  enabled: boolean;
  isDefault: boolean;
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
  tracked_nutrients?: TrackedNutrient[];
  
  // Tags
  tracking_tags: TrackingTag[];
  
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
  log_time?: string | null;
  created_at?: string;
}

