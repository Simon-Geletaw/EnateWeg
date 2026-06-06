import { query, queryOne } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { generateMealPlan, GeneratedMeal, GeneratedPlan } from '../utils/ai.service';
import { calculateTargets, ProfileData, Targets } from '../utils/nutrition';

interface GenerateAndPersistOptions {
  userId: string;
  triggerReason: string;
  tightenForHighSugar?: boolean;
}

interface GenerateAndPersistResult {
  planId: string;
  planData: GeneratedPlan;
  targets: Targets;
}

function getDateForOffset(base: Date, offset: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function getSafePlanDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString().split('T')[0];
}

function getAdjustedTargets(baseTargets: Targets, tightenForHighSugar: boolean): Targets {
  if (!tightenForHighSugar) return baseTargets;

  return {
    ...baseTargets,
    carb_g: Math.max(80, Math.round(baseTargets.carb_g * 0.85)),
    sugar_g: Math.max(15, Math.round(baseTargets.sugar_g * 0.7)),
  };
}

async function insertMealAndSlot(
  userId: string,
  dayId: string,
  slotType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  meal: GeneratedMeal
): Promise<void> {
  const insertedMeal = await query<{ id: string }>(
    `INSERT INTO meals (name_en, name_am, meal_type, source, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [meal.name_en, meal.name_am || null, slotType, 'ai_generated', userId]
  );

  const mealId = insertedMeal[0].id;

  await query(
    `INSERT INTO meal_plan_slots (day_id, slot_type, slot_index, meal_id)
     VALUES ($1, $2, 0, $3)`,
    [dayId, slotType, mealId]
  );

  for (const item of meal.items) {
    const ingredient = await queryOne<{ id: string }>(
      `SELECT id
       FROM ingredients
       WHERE LOWER(name_en) = LOWER($1) OR LOWER(name_am) = LOWER($2)
       LIMIT 1`,
      [item.name_en, item.name_am || '']
    );

    if (!ingredient) continue;

    await query(
      `INSERT INTO meal_items (meal_id, ingredient_id, quantity_g)
       VALUES ($1, $2, $3)
       ON CONFLICT (meal_id, ingredient_id)
       DO UPDATE SET quantity_g = EXCLUDED.quantity_g`,
      [mealId, ingredient.id, item.quantity_g]
    );
  }
}

export async function generateAndPersistMealPlan(
  options: GenerateAndPersistOptions
): Promise<GenerateAndPersistResult> {
  const { userId, triggerReason, tightenForHighSugar = false } = options;

  const profile = await queryOne<any>(`SELECT * FROM health_profiles WHERE user_id = $1`, [userId]);
  if (!profile) {
    throw new AppError(400, 'PROFILE_INCOMPLETE', 'Health profile not completed', 'የጤና መገለጫ አልተጠናቀቀም');
  }

  const conditions = await query<{ code: string }>(
    `SELECT c.code
     FROM user_conditions uc
     JOIN medical_conditions c ON uc.condition_id = c.id
     WHERE uc.user_id = $1`,
    [userId]
  );

  const profileData: ProfileData = {
    sex: profile.sex,
    birth_year: profile.birth_year,
    height_cm: Number(profile.height_cm),
    current_weight_kg: Number(profile.current_weight_kg),
    target_weight_kg: profile.target_weight_kg ? Number(profile.target_weight_kg) : undefined,
    activity_level: profile.activity_level,
    primary_goal: profile.primary_goal,
    fasting_type: profile.fasting_type,
    is_vegetarian: profile.is_vegetarian,
    is_vegan: profile.is_vegan,
    conditions: conditions.map((c) => c.code),
  };

  const baseTargets = calculateTargets(profileData);
  const targets = getAdjustedTargets(baseTargets, tightenForHighSugar);

  const weekStart = new Date();
  const planData = await generateMealPlan(profileData, targets, weekStart);

  await query(`UPDATE meal_plans SET status = 'replaced' WHERE user_id = $1 AND status = 'active'`, [userId]);

  const normalizedReason = triggerReason.slice(0, 30);
  const insertedPlan = await query<{ id: string }>(
    `INSERT INTO meal_plans (user_id, week_start, profile_version, trigger_reason)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [userId, weekStart, profile.profile_version, normalizedReason]
  );

  const planId = insertedPlan[0].id;

  await query(`UPDATE lifestyle_plans SET status = 'replaced' WHERE user_id = $1 AND status = 'active'`, [userId]);

  await query(
    `INSERT INTO lifestyle_plans
      (user_id, meal_plan_id, sleep_target_start, sleep_target_end, sleep_note_am, sleep_note_en, exercise_suggestions)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      planId,
      planData.lifestyle.sleep_target_start,
      planData.lifestyle.sleep_target_end,
      planData.lifestyle.sleep_note_am,
      planData.lifestyle.sleep_note_en,
      JSON.stringify(planData.lifestyle.exercise_suggestions),
    ]
  );

  for (let i = 0; i < planData.days.length; i++) {
    const day = planData.days[i];
    const fallbackDate = getDateForOffset(weekStart, i);
    const planDate = getSafePlanDate(day.date, fallbackDate);

    const insertedDay = await query<{ id: string }>(
      `INSERT INTO meal_plan_days (plan_id, plan_date, day_kcal_target)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [planId, planDate, targets.kcal]
    );

    const dayId = insertedDay[0].id;

    await insertMealAndSlot(userId, dayId, 'breakfast', day.breakfast);
    await insertMealAndSlot(userId, dayId, 'lunch', day.lunch);
    await insertMealAndSlot(userId, dayId, 'dinner', day.dinner);
    await insertMealAndSlot(userId, dayId, 'snack', day.snack);
  }

  return {
    planId,
    planData,
    targets,
  };
}
