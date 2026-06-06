import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { query, queryOne } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { generateAndPersistMealPlan } from '../services/planGeneration.service';

export async function generatePlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { planId, planData } = await generateAndPersistMealPlan({
      userId,
      triggerReason: req.body.trigger_reason || 'initial',
    });

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

export async function getCurrentWeeklyPlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    const plan = await queryOne(
      `SELECT * FROM meal_plans WHERE user_id = $1 AND status = 'active' ORDER BY generated_at DESC LIMIT 1`,
      [userId]
    );

    if (!plan) {
      throw new AppError(404, 'NOT_FOUND', 'No active meal plan found', 'ምንም ንቁ የምግብ ዕቅድ አልተገኘም');
    }

    const lifestyle = await queryOne(
      `SELECT * FROM lifestyle_plans WHERE user_id = $1 AND meal_plan_id = $2 ORDER BY generated_at DESC LIMIT 1`,
      [userId, plan.id]
    );

    const rows = await query<{
      day_id: string;
      plan_date: string;
      day_kcal_target: number | null;
      slot_id: string | null;
      slot_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
      slot_index: number | null;
      is_logged: boolean | null;
      meal_id: string | null;
      meal_name_en: string | null;
      meal_name_am: string | null;
      meal_source: string | null;
      meal_total_kcal: number | null;
      item_id: string | null;
      quantity_g: number | null;
      ingredient_id: string | null;
      ingredient_name_en: string | null;
      ingredient_name_am: string | null;
    }>(
      `SELECT
        d.id AS day_id,
        d.plan_date,
        d.day_kcal_target,
        s.id AS slot_id,
        s.slot_type,
        s.slot_index,
        s.is_logged,
        m.id AS meal_id,
        m.name_en AS meal_name_en,
        m.name_am AS meal_name_am,
        m.source AS meal_source,
        m.total_kcal AS meal_total_kcal,
        mi.id AS item_id,
        mi.quantity_g,
        i.id AS ingredient_id,
        i.name_en AS ingredient_name_en,
        i.name_am AS ingredient_name_am
      FROM meal_plan_days d
      LEFT JOIN meal_plan_slots s ON s.day_id = d.id
      LEFT JOIN meals m ON m.id = s.meal_id
      LEFT JOIN meal_items mi ON mi.meal_id = m.id
      LEFT JOIN ingredients i ON i.id = mi.ingredient_id
      WHERE d.plan_id = $1
      ORDER BY d.plan_date ASC, s.slot_type ASC, s.slot_index ASC, mi.id ASC`,
      [plan.id]
    );

    const dayMap = new Map<
      string,
      {
        day_id: string;
        date: string;
        day_kcal_target: number | null;
        slots: Array<{
          slot_id: string;
          slot_type: string;
          slot_index: number;
          is_logged: boolean;
          meal: {
            id: string;
            name_en: string | null;
            name_am: string | null;
            source: string | null;
            total_kcal: number | null;
            items: Array<{
              item_id: string;
              ingredient_id: string | null;
              ingredient_name_en: string | null;
              ingredient_name_am: string | null;
              quantity_g: number | null;
            }>;
          } | null;
        }>;
      }
    >();

    const slotMap = new Map<
      string,
      {
        slot_id: string;
        slot_type: string;
        slot_index: number;
        is_logged: boolean;
        meal: {
          id: string;
          name_en: string | null;
          name_am: string | null;
          source: string | null;
          total_kcal: number | null;
          items: Array<{
            item_id: string;
            ingredient_id: string | null;
            ingredient_name_en: string | null;
            ingredient_name_am: string | null;
            quantity_g: number | null;
          }>;
        } | null;
      }
    >();

    for (const row of rows) {
      if (!dayMap.has(row.day_id)) {
        dayMap.set(row.day_id, {
          day_id: row.day_id,
          date: row.plan_date,
          day_kcal_target: row.day_kcal_target,
          slots: [],
        });
      }

      if (!row.slot_id) continue;

      if (!slotMap.has(row.slot_id)) {
        const slot = {
          slot_id: row.slot_id,
          slot_type: row.slot_type || 'snack',
          slot_index: row.slot_index ?? 0,
          is_logged: row.is_logged ?? false,
          meal: row.meal_id
            ? {
                id: row.meal_id,
                name_en: row.meal_name_en,
                name_am: row.meal_name_am,
                source: row.meal_source,
                total_kcal: row.meal_total_kcal,
                items: [],
              }
            : null,
        };

        slotMap.set(row.slot_id, slot);
        dayMap.get(row.day_id)!.slots.push(slot);
      }

      const slot = slotMap.get(row.slot_id)!;
      if (slot.meal && row.item_id) {
        slot.meal.items.push({
          item_id: row.item_id,
          ingredient_id: row.ingredient_id,
          ingredient_name_en: row.ingredient_name_en,
          ingredient_name_am: row.ingredient_name_am,
          quantity_g: row.quantity_g,
        });
      }
    }

    const days = Array.from(dayMap.values());

    res.json({
      plan_id: plan.id,
      week_start: plan.week_start,
      trigger_reason: plan.trigger_reason,
      generated_at: plan.generated_at,
      lifestyle,
      days,
    });
  } catch (error) {
    next(error);
  }
}
