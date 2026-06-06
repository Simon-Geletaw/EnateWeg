import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { query, queryOne } from '../config/database';
import { HealthProfileInput } from '../schemas';
import { calculateTargets } from '../utils/nutrition';
import { AppError } from '../middleware/errorHandler';

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

    const requiresSugarTracking = data.conditions.includes('diabetes_t1') || data.conditions.includes('diabetes_t2');

    // In Phase 3 this will actually generate a plan.
    // For now, we mock the plan ID.
    res.json({
      profile_version: newVersion,
      bmi: Number((data.current_weight_kg / ((data.height_cm / 100) * (data.height_cm / 100))).toFixed(1)),
      targets,
      requires_blood_sugar_tracking: requiresSugarTracking,
      plan_id: 'dummy-plan-id'
    });
  } catch (error) {
    next(error);
  }
}
