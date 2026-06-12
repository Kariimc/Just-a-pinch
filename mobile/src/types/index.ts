export interface Ingredient {
  id: string;
  quantity: string;
  unit: string;
  name: string;
  section?: string;
  checked?: boolean;
}

export interface Step {
  id: string;
  number: number;
  text: string;
  timerSeconds?: number;
  imageUri?: string;
}

export interface NutritionInfo {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  imageUri?: string;
  imageColor?: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  ingredients: Ingredient[];
  steps: Step[];
  tags: string[];
  collections: string[];
  sourceUrl?: string;
  nutrition?: NutritionInfo;
  notes?: string;
  rating?: number;
  cookedCount?: number;
  savedAt: number;
  createdAt: number;
  isSaved?: boolean;
  isFamily?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  imageColor?: string;
  isFamily?: boolean;
  recipeIds: string[];
  createdAt: number;
}

export interface MealPlanEntry {
  id: string;
  recipeId: string;
  date: string; // YYYY-MM-DD
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: string;
  checked: boolean;
  recipeIds?: string[];
  isManual?: boolean;
}

export interface PantryItem {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  category: string;
  expiryDate?: string;
  isLow?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUri?: string;
  dietaryPrefs: string[];
  skillLevel: 'beginner' | 'confident' | 'expert';
  householdSize: number;
  preferMetric: boolean;
  darkMode: boolean;
}

export type RootStackParamList = {
  Onboarding: undefined;
  Welcome: undefined;
  SignUp: undefined;
  LogIn: undefined;
  ResetPassword: undefined;
  PersonalizationQuiz: undefined;
  Main: undefined;
  RecipeDetail: { recipeId: string };
  CookingMode: { recipeId: string };
  RecipeEditor: { recipeId?: string };
  AddMenu: undefined;
  AIGenerator: undefined;
  Search: { initialQuery?: string } | undefined;
  AddToMealPlan: { recipeId: string };
  Settings: undefined;
  Badges: undefined;
  Paywall: { source?: 'onboarding' | 'settings' } | undefined;
  Community: undefined;
};

export type TabParamList = {
  Home: undefined;
  Recipes: undefined;
  Add: undefined;
  Plan: undefined;
  Shopping: undefined;
};
