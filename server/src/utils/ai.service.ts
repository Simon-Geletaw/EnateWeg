import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { ProfileData, Targets } from './nutrition';

let gemini: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY) {
  gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

function extractJsonFromText(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fencedMatch?.[1]?.trim() || trimmed;
}

export interface GeneratedMealItem {
  name_en: string;
  name_am: string;
  quantity_g: number;
}

export interface GeneratedMeal {
  name_en: string;
  name_am: string;
  items: GeneratedMealItem[];
}

export interface GeneratedDay {
  date: string; // YYYY-MM-DD
  breakfast: GeneratedMeal;
  lunch: GeneratedMeal;
  dinner: GeneratedMeal;
  snack: GeneratedMeal;
}

export interface GeneratedLifestyle {
  sleep_target_start: string; // HH:MM
  sleep_target_end: string;
  sleep_note_en: string;
  sleep_note_am: string;
  exercise_suggestions: Array<{
    name_en: string;
    category: string;
    duration_min: number;
    days: string[];
  }>;
}

export interface GeneratedPlan {
  days: GeneratedDay[];
  lifestyle: GeneratedLifestyle;
}

export async function generateMealPlan(
  profile: ProfileData,
  targets: Targets,
  weekStartDate: Date
): Promise<GeneratedPlan> {
  const prompt = `
You are an expert Ethiopian nutritionist. Generate a 7-day meal plan and lifestyle suggestions based on the following user profile and targets.
The meals MUST be primarily Ethiopian cuisine, adjusted for the user's constraints.

Profile:
- Sex: ${profile.sex}
- Age: ${new Date().getFullYear() - profile.birth_year}
- Weight: ${profile.current_weight_kg} kg
- Goal: ${profile.primary_goal}
- Activity: ${profile.activity_level}
- Conditions: ${profile.conditions.join(', ') || 'None'}
- Fasting: ${profile.fasting_type}
- Vegetarian: ${profile.is_vegetarian}
- Vegan: ${profile.is_vegan}

Daily Targets:
- Calories: ${targets.kcal} kcal
- Protein: ${targets.protein_g} g
- Carbs: ${targets.carb_g} g
- Fat: ${targets.fat_g} g
- Sugar limit: ${targets.sugar_g} g
- Sodium limit: ${targets.sodium_mg} mg

Week Start Date: ${weekStartDate.toISOString().split('T')[0]}

Respond ONLY with valid JSON.
Format Requirements:
{
  "days": [
    {
      "date": "YYYY-MM-DD", // Start from the week start date and increment by 1 day for 7 days
      "breakfast": { "name_en": "", "name_am": "", "items": [{ "name_en": "", "name_am": "", "quantity_g": 0 }] },
      "lunch": { ... },
      "dinner": { ... },
      "snack": { ... }
    }
  ],
  "lifestyle": {
    "sleep_target_start": "22:00",
    "sleep_target_end": "06:00",
    "sleep_note_en": "Get 8 hours of sleep",
    "sleep_note_am": "8 ሰዓት መተኛት አለቦት",
    "exercise_suggestions": [
      { "name_en": "Brisk Walk", "category": "low_impact", "duration_min": 30, "days": ["mon", "wed", "fri"] }
    ]
  }
}
`;

  try {
    if (!gemini) {
      throw new Error('GEMINI_API_KEY is missing. Please configure it in the .env file.');
    }
    const modelCandidates = [
      env.GEMINI_MODEL,
      'gemini-1.5-flash-latest',
      'gemini-2.0-flash',
      'gemini-1.5-pro-latest',
    ].filter((value, index, arr) => Boolean(value) && arr.indexOf(value) === index);

    let lastError: unknown = null;
    for (const modelName of modelCandidates) {
      try {
        const model = gemini.getGenerativeModel({ model: modelName });
        const response = await model.generateContent(prompt);
        const content = response.response.text();
        if (!content) throw new Error('No content received from AI');

        const jsonText = extractJsonFromText(content);
        return JSON.parse(jsonText) as GeneratedPlan;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('No available Gemini model could generate content.');
  } catch (error) {
    console.error('AI Generation Error:', error);
    throw new Error('Failed to generate meal plan from AI');
  }
}
