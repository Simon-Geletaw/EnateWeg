import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { query } from '../config/database';
import { HealthReadingInput } from '../schemas';
import { generateAndPersistMealPlan } from '../services/planGeneration.service';

export async function logHealthReading(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = req.body as HealthReadingInput;
    const userId = req.user!.id;

    const inserted = await query(
      `INSERT INTO health_readings (user_id, reading_type, value_mg_dl, systolic_mm_hg, diastolic_mm_hg, context, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [userId, data.reading_type, data.value_mg_dl || null, data.systolic_mm_hg || null, data.diastolic_mm_hg || null, data.context, data.note || null]
    );

    let planUpdated = false;
    let newPlanId: string | undefined;
    let messageEn = 'Reading recorded successfully';
    let messageAm = 'ንባብ በተሳካ ሁኔታ ተመዝግቧል';

    // Check if blood sugar is high (e.g., > 140 for fasting)
    if (data.reading_type === 'blood_sugar' && data.context === 'fasting' && data.value_mg_dl! > 140) {
      try {
        const generated = await generateAndPersistMealPlan({
          userId,
          triggerReason: 'blood_sugar',
          tightenForHighSugar: true,
        });
        planUpdated = true;
        newPlanId = generated.planId;
        messageEn = 'Your fasting sugar is high. Your plan was adjusted to lower-glycemic meals.';
        messageAm = 'የጾም ስኳርዎ ከፍተኛ ነው። ዕቅድዎ ዝቅተኛ ግሊሴሚክ ላላቸው ምግቦች ተስተካክሏል።';
      } catch (_generationError) {
        // Reading is still valid; report that adaptive plan generation was skipped.
        planUpdated = false;
        messageEn = 'Reading recorded. High fasting sugar detected, but automatic plan adjustment failed.';
        messageAm = 'ንባቡ ተመዝግቧል። የጾም ስኳር ከፍተኛ መሆን ተገኝቷል ግን የራስ-ሰር ዕቅድ ማስተካከያ አልተሳካም።';
      }
    }

    res.status(201).json({
      reading_id: inserted[0].id,
      value_mg_dl: data.value_mg_dl,
      status: planUpdated ? 'high' : 'normal',
      plan_updated: planUpdated,
      new_plan_id: newPlanId,
      message_en: messageEn,
      message_am: messageAm
    });
  } catch (error) {
    next(error);
  }
}

export async function getHealthReadings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { type, days = '30' } = req.query;
    const userId = req.user!.id;

    const readings = await query(
      `SELECT * FROM health_readings WHERE user_id = $1 AND reading_type = $2 AND measured_at >= NOW() - INTERVAL '${parseInt(days as string, 10)} days' ORDER BY measured_at DESC`,
      [userId, type]
    );

    res.json(readings);
  } catch (error) {
    next(error);
  }
}
