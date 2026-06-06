import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { query, queryOne } from '../config/database';
import { generateMealPlan } from '../utils/ai.service';
import { AppError } from '../middleware/errorHandler';
import { calculateTargets } from '../utils/nutrition';

export async function generatePlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    
    // Fetch profile
    const profile = await queryOne(`SELECT * FROM health_profiles WHERE user_id = $1`, [userId]);
    if (!profile) {
      throw new AppError(400, 'PROFILE_INCOMPLETE', 'Health profile not completed', 'የጤና መገለጫ አልተጠናቀቀም');
    }

    const conditions = await query(
      `SELECT c.code FROM user_conditions uc JOIN medical_conditions c ON uc.condition_id = c.id WHERE uc.user_id = $1`,
      [userId]
    );
    profile.conditions = conditions.map(c => c.code);

    const targets = calculateTargets(profile);
    const weekStart = new Date(); // Today

    // Call AI
    const planData = await generateMealPlan(profile, targets, weekStart);

    // Save plan to DB (Simplified for MVP, would normally involve inserting ingredients, meals, slots, etc.)
    // We will update the status of existing plans
    await query(`UPDATE meal_plans SET status = 'replaced' WHERE user_id = $1`, [userId]);
    
    const planResult = await query(
      `INSERT INTO meal_plans (user_id, week_start, profile_version, trigger_reason)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, weekStart, profile.profile_version, req.body.trigger_reason || 'initial']
    );
    const planId = planResult[0].id;

    // Save lifestyle
    await query(`UPDATE lifestyle_plans SET status = 'replaced' WHERE user_id = $1`, [userId]);
    await query(
      `INSERT INTO lifestyle_plans (user_id, meal_plan_id, sleep_target_start, sleep_target_end, sleep_note_am, sleep_note_en, exercise_suggestions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId, planId, 
        planData.lifestyle.sleep_target_start, 
        planData.lifestyle.sleep_target_end, 
        planData.lifestyle.sleep_note_am, 
        planData.lifestyle.sleep_note_en, 
        JSON.stringify(planData.lifestyle.exercise_suggestions)
      ]
    );

    // Mocking the detailed insertion of meals/ingredients/items/days/slots for brevity,
    // but in a real scenario we would iterate over planData.days and insert into respective tables.

    res.json({ message: 'Plan generated successfully', plan_id: planId, plan_data: planData });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentPlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    
    const plan = await queryOne(`SELECT * FROM meal_plans WHERE user_id = $1 AND status = 'active'`, [userId]);
    if (!plan) {
      throw new AppError(404, 'NOT_FOUND', 'No active meal plan found', 'ምንም ንቁ የምግብ ዕቅድ አልተገኘም');
    }

    const lifestyle = await queryOne(`SELECT * FROM lifestyle_plans WHERE user_id = $1 AND status = 'active'`, [userId]);

    res.json({
      plan_id: plan.id,
      week_start: plan.week_start,
      trigger_reason: plan.trigger_reason,
      lifestyle
    });
  } catch (error) {
    next(error);
  }
}
