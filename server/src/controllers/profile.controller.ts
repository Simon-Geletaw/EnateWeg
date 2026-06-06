import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { query, queryOne } from '../config/database';
import { HealthProfileInput, UpdateUserInput } from '../schemas';
import { calculateTargets } from '../utils/nutrition';
import { AppError } from '../middleware/errorHandler';
import { generateAndPersistMealPlan } from '../services/planGeneration.service';

/**
 * GET /v1/users/me
 * Returns the authenticated user's account info plus a compact health summary
 * (whether a profile exists, key targets, BMI, conditions).
 */
export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    const user = await queryOne(
      `SELECT id, phone_number, google_uid, full_name, preferred_lang, is_active, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found', 'ተጠቃሚው አልተገኘም');
    }

    const profile = await queryOne(
      `SELECT bmi, daily_kcal_target, protein_g_target, carb_g_target, fat_g_target,
              sodium_mg_target, sugar_g_target, primary_goal, profile_version
       FROM health_profiles WHERE user_id = $1`,
      [userId]
    );

    const conditions = await query(
      `SELECT c.code FROM user_conditions uc
         JOIN medical_conditions c ON uc.condition_id = c.id
       WHERE uc.user_id = $1`,
      [userId]
    );
    const conditionCodes = conditions.map((c) => c.code);

    const hasActivePlan = await queryOne(
      `SELECT 1 FROM meal_plans WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId]
    );

    res.json({
      id: user.id,
      phone_number: user.phone_number,
      google_uid: user.google_uid,
      full_name: user.full_name,
      preferred_lang: user.preferred_lang,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      health_summary: {
        has_profile: !!profile,
        profile_version: profile?.profile_version ?? null,
        bmi: profile?.bmi ?? null,
        primary_goal: profile?.primary_goal ?? null,
        targets: profile
          ? {
              kcal: profile.daily_kcal_target,
              protein_g: profile.protein_g_target,
              carb_g: profile.carb_g_target,
              fat_g: profile.fat_g_target,
              sodium_mg: profile.sodium_mg_target,
              sugar_g: profile.sugar_g_target,
            }
          : null,
        conditions: conditionCodes,
        requires_blood_sugar_tracking:
          conditionCodes.includes('diabetes_t1') || conditionCodes.includes('diabetes_t2'),
        has_active_plan: !!hasActivePlan,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /v1/users/me
 * Updates the user's name and/or preferred language.
 */
export async function updateMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as UpdateUserInput;

    const updated = await query(
      `UPDATE users SET
         full_name = COALESCE($1, full_name),
         preferred_lang = COALESCE($2, preferred_lang),
         updated_at = NOW()
       WHERE id = $3
       RETURNING id, phone_number, full_name, preferred_lang, is_active, created_at, updated_at`,
      [data.full_name ?? null, data.preferred_lang ?? null, userId]
    );

    if (updated.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'User not found', 'ተጠቃሚው አልተገኘም');
    }

    res.json(updated[0]);
  } catch (error) {
    next(error);
  }
}

export async function getHealthProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await queryOne(`SELECT * FROM health_profiles WHERE user_id = $1`, [req.user!.id]);
    
    if (!profile) {
      throw new AppError(404, 'NOT_FOUND', 'Health profile not found', 'የጤና መገለጫ አልተገኘም');
    }

    const conditions = await query(
      `SELECT c.code FROM user_conditions uc JOIN medical_conditions c ON uc.condition_id = c.id WHERE uc.user_id = $1`,
      [req.user!.id]
    );

    res.json({ ...profile, conditions: conditions.map((c) => c.code) });
  } catch (error) {
    next(error);
  }
}

export async function upsertHealthProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data = req.body as HealthProfileInput;
    const userId = req.user!.id;

    const targets = calculateTargets(data);

    // Get condition IDs
    const conditionIds: number[] = [];
    if (data.conditions.length > 0) {
      const dbConditions = await query(`SELECT id, code FROM medical_conditions WHERE code = ANY($1)`, [data.conditions]);
      for (const code of data.conditions) {
        const found = dbConditions.find(c => c.code === code);
        if (found) conditionIds.push(found.id);
      }
    }

    // Upsert profile
    const existing = await queryOne(`SELECT id, profile_version FROM health_profiles WHERE user_id = $1`, [userId]);

    let newVersion = 1;
    if (existing) {
      newVersion = existing.profile_version + 1;
      await query(
        `UPDATE health_profiles SET 
          sex = $1, birth_year = $2, height_cm = $3, current_weight_kg = $4, target_weight_kg = $5,
          activity_level = $6, primary_goal = $7, wake_time = $8, sleep_time = $9, fasting_type = $10,
          is_vegetarian = $11, is_vegan = $12, allergies = $13, daily_kcal_target = $14,
          protein_g_target = $15, carb_g_target = $16, fat_g_target = $17, sodium_mg_target = $18,
          sugar_g_target = $19, profile_version = $20, updated_at = NOW()
         WHERE user_id = $21`,
        [
          data.sex, data.birth_year, data.height_cm, data.current_weight_kg, data.target_weight_kg || null,
          data.activity_level, data.primary_goal, data.wake_time || null, data.sleep_time || null, data.fasting_type,
          data.is_vegetarian, data.is_vegan, data.allergies, targets.kcal,
          targets.protein_g, targets.carb_g, targets.fat_g, targets.sodium_mg,
          targets.sugar_g, newVersion, userId
        ]
      );
    } else {
      await query(
        `INSERT INTO health_profiles (
          user_id, sex, birth_year, height_cm, current_weight_kg, target_weight_kg,
          activity_level, primary_goal, wake_time, sleep_time, fasting_type,
          is_vegetarian, is_vegan, allergies, daily_kcal_target,
          protein_g_target, carb_g_target, fat_g_target, sodium_mg_target,
          sugar_g_target, profile_version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
        [
          userId, data.sex, data.birth_year, data.height_cm, data.current_weight_kg, data.target_weight_kg || null,
          data.activity_level, data.primary_goal, data.wake_time || null, data.sleep_time || null, data.fasting_type,
          data.is_vegetarian, data.is_vegan, data.allergies, targets.kcal,
          targets.protein_g, targets.carb_g, targets.fat_g, targets.sodium_mg,
          targets.sugar_g, newVersion
        ]
      );
    }

    // Update user conditions
    await query(`DELETE FROM user_conditions WHERE user_id = $1`, [userId]);
    for (const cid of conditionIds) {
      await query(`INSERT INTO user_conditions (user_id, condition_id) VALUES ($1, $2)`, [userId, cid]);
    }

    let planId: string | null = null;
    let planGenerationStatus: 'generated' | 'failed' = 'failed';

    try {
      const generated = await generateAndPersistMealPlan({
        userId,
        triggerReason: existing ? 'profile_update' : 'initial',
      });
      planId = generated.planId;
      planGenerationStatus = 'generated';
    } catch (generationError) {
      console.error('⚠️ Plan generation skipped after profile save:', generationError);
    }

    const requiresSugarTracking = data.conditions.includes('diabetes_t1') || data.conditions.includes('diabetes_t2');

    res.json({
      profile_version: newVersion,
      bmi: Number((data.current_weight_kg / ((data.height_cm / 100) * (data.height_cm / 100))).toFixed(1)),
      targets,
      requires_blood_sugar_tracking: requiresSugarTracking,
      plan_id: planId,
      plan_generation_status: planGenerationStatus,
    });
  } catch (error) {
    next(error);
  }
}
