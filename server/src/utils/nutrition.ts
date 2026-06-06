export interface ProfileData {
  sex: 'male' | 'female' | 'other';
  birth_year: number;
  height_cm: number;
  current_weight_kg: number;
  target_weight_kg?: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active';
  primary_goal: 'lose_weight' | 'gain_weight' | 'maintain' | 'manage_condition';
  fasting_type?: 'none' | 'orthodox' | 'ramadan';
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  conditions: string[];
}

export interface Targets {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  sodium_mg: number;
  sugar_g: number;
}

export function calculateTargets(profile: ProfileData): Targets {
  const age = new Date().getFullYear() - profile.birth_year;
  
  // Harris-Benedict BMR
  let bmr = 0;
  if (profile.sex === 'female') {
    bmr = 447.593 + (9.247 * profile.current_weight_kg) + (3.098 * profile.height_cm) - (4.330 * age);
  } else {
    // Default to male calculation for 'other'
    bmr = 88.362 + (13.397 * profile.current_weight_kg) + (4.799 * profile.height_cm) - (5.677 * age);
  }

  // Activity multiplier
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725
  };
  let tdee = bmr * multipliers[profile.activity_level];

  // Adjust TDEE based on goal
  if (profile.primary_goal === 'lose_weight') {
    tdee -= 500;
  } else if (profile.primary_goal === 'gain_weight') {
    tdee += 500;
  }

  const kcal = Math.round(tdee);

  // Macros - Defaults: Protein 20%, Carbs 50%, Fat 30%
  let proteinPct = 0.20;
  let carbPct = 0.50;
  let fatPct = 0.30;

  // Diabetes tweaks (lower carbs, higher protein/fat)
  if (profile.conditions.includes('diabetes_t1') || profile.conditions.includes('diabetes_t2')) {
    carbPct = 0.40;
    proteinPct = 0.25;
    fatPct = 0.35;
  }

  const protein_g = Math.round((kcal * proteinPct) / 4);
  const carb_g = Math.round((kcal * carbPct) / 4);
  const fat_g = Math.round((kcal * fatPct) / 9);

  // Micronutrients
  let sodium_mg = 2300;
  if (profile.conditions.includes('hypertension')) {
    sodium_mg = 1500;
  }

  let sugar_g = 50; // max 50g default
  if (profile.conditions.includes('diabetes_t1') || profile.conditions.includes('diabetes_t2')) {
    sugar_g = 25; // stricter limit
  }

  return {
    kcal,
    protein_g,
    carb_g,
    fat_g,
    sodium_mg,
    sugar_g
  };
}
