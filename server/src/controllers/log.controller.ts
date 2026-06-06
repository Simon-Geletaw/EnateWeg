import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { query, queryOne } from '../config/database';
import { LogMealInput } from '../schemas';
import { AppError } from '../middleware/errorHandler';

export async function logMeal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { date } = req.params;
    const data = req.body as LogMealInput;
    const userId = req.user!.id;

    // Ensure daily_log exists
    let dailyLog = await queryOne(`SELECT id FROM daily_logs WHERE user_id = $1 AND log_date = $2`, [userId, date]);
    if (!dailyLog) {
      const inserted = await query(`INSERT INTO daily_logs (user_id, log_date) VALUES ($1, $2) RETURNING id`, [userId, date]);
      dailyLog = inserted[0];
    }

    let mealId;
    let slotType;

    if (data.adherence === 'followed') {
      const planSlot = await queryOne(`SELECT meal_id, slot_type FROM meal_plan_slots WHERE id = $1`, [data.plan_slot_id]);
      if (!planSlot) throw new AppError(404, 'NOT_FOUND', 'Plan slot not found');
      mealId = planSlot.meal_id;
      slotType = planSlot.slot_type;

      // mark slot as logged
      await query(`UPDATE meal_plan_slots SET is_logged = TRUE WHERE id = $1`, [data.plan_slot_id]);
    } else {
      slotType = data.slot_type;
      // create user_logged meal
      const insertedMeal = await query(
        `INSERT INTO meals (name_en, name_am, meal_type, source, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [data.meal.name_en, data.meal.name_am || null, slotType, 'user_logged', userId]
      );
      mealId = insertedMeal[0].id;

      // Insert items (Mocked nutrition aggregation for brevity)
      for (const item of data.meal.items) {
        await query(`INSERT INTO meal_items (meal_id, ingredient_id, quantity_g) VALUES ($1, $2, $3)`, [mealId, item.ingredient_id, item.quantity_g]);
      }
      
      if (data.plan_slot_id) {
         await query(`UPDATE meal_plan_slots SET is_logged = TRUE WHERE id = $1`, [data.plan_slot_id]);
      }
    }

    const logResult = await query(
      `INSERT INTO meal_logs (daily_log_id, slot_type, plan_slot_id, meal_id, adherence) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [dailyLog.id, slotType, data.adherence === 'followed' ? data.plan_slot_id : null, mealId, data.adherence]
    );

    res.status(201).json({ message: 'Meal logged successfully', log_id: logResult[0].id });
  } catch (error) {
    next(error);
  }
}

export async function getDailyLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { date } = req.params;
    const userId = req.user!.id;
    const dailyLog = await queryOne(`SELECT * FROM daily_logs WHERE user_id = $1 AND log_date = $2`, [userId, date]);
    
    // For MVP, returning a mocked summary
    res.json({
      date,
      water_ml: dailyLog?.water_ml || 0,
      targets: { kcal: 2000, protein_g: 100, carb_g: 250, sodium_mg: 2000, sugar_g: 50 },
      consumed: { kcal: 1500, protein_g: 75, carb_g: 180, sodium_mg: 1200, sugar_g: 30 },
      entries: [],
      sodium_alert: false,
      sugar_alert: false
    });
  } catch (error) {
    next(error);
  }
}

export async function logWater(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { date } = req.params;
    const { amount_ml } = req.body;
    const userId = req.user!.id;

    await query(
      `INSERT INTO daily_logs (user_id, log_date, water_ml) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, log_date) DO UPDATE SET water_ml = daily_logs.water_ml + EXCLUDED.water_ml`,
      [userId, date, amount_ml]
    );

    res.status(201).json({ message: 'Water logged successfully' });
  } catch (error) {
    next(error);
  }
}
