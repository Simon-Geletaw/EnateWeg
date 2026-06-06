/**
 * Zod schemas for MVP request body validation.
 * Covers: Auth, Health Profile, Ingredients, Meal Logging, Health Readings.
 */
import { z } from 'zod';

// ─── Auth ──────────────────────────────────────────────────────────────

export const sendOtpSchema = z.object({
  phone_number: z
    .string()
    .min(9, 'Phone number too short')
    .max(20, 'Phone number too long')
    .regex(/^\+?[0-9]+$/, 'Invalid phone number format'),
});

export const verifyOtpSchema = z.object({
  phone_number: z
    .string()
    .min(9)
    .max(20)
    .regex(/^\+?[0-9]+$/),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  full_name: z.string().min(2).max(120).optional(), // required for new users
  preferred_lang: z.enum(['am', 'en']).optional().default('am'),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

// ─── Health Profile ────────────────────────────────────────────────────

export const healthProfileSchema = z.object({
  sex: z.enum(['male', 'female', 'other']),
  birth_year: z
    .number()
    .int()
    .min(1930)
    .max(new Date().getFullYear() - 10),
  height_cm: z.number().min(50).max(300),
  current_weight_kg: z.number().min(20).max(500),
  target_weight_kg: z.number().min(20).max(500).optional(),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active']).default('sedentary'),
  primary_goal: z.enum(['lose_weight', 'gain_weight', 'maintain', 'manage_condition']),
  wake_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Use HH:MM format')
    .optional(),
  sleep_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Use HH:MM format')
    .optional(),
  fasting_type: z.enum(['none', 'orthodox', 'ramadan']).default('none'),
  is_vegetarian: z.boolean().default(false),
  is_vegan: z.boolean().default(false),
  allergies: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]), // e.g. ['diabetes_t2', 'hypertension']
});

export const healthProfilePatchSchema = healthProfileSchema.partial();

// ─── Meal Logging ──────────────────────────────────────────────────────

export const logMealFollowedSchema = z.object({
  plan_slot_id: z.string().uuid(),
  adherence: z.literal('followed'),
});

export const logMealSubstitutedSchema = z.object({
  plan_slot_id: z.string().uuid().optional(),
  adherence: z.literal('substituted'),
  slot_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  meal: z.object({
    name_en: z.string().min(1).max(150),
    name_am: z.string().max(150).optional(),
    items: z
      .array(
        z.object({
          ingredient_id: z.string().uuid(),
          quantity_g: z.number().positive(),
        })
      )
      .min(1, 'At least one ingredient is required'),
  }),
});

export const logMealSchema = z.discriminatedUnion('adherence', [
  logMealFollowedSchema,
  logMealSubstitutedSchema,
]);

// ─── Health Readings ───────────────────────────────────────────────────

export const healthReadingSchema = z
  .object({
    reading_type: z.enum(['blood_sugar', 'blood_pressure']),
    value_mg_dl: z.number().positive().optional(),
    systolic_mm_hg: z.number().int().positive().optional(),
    diastolic_mm_hg: z.number().int().positive().optional(),
    context: z
      .enum(['fasting', 'pre_meal', 'post_meal', 'random'])
      .default('random'),
    note: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.reading_type === 'blood_sugar') return data.value_mg_dl !== undefined;
      if (data.reading_type === 'blood_pressure')
        return data.systolic_mm_hg !== undefined && data.diastolic_mm_hg !== undefined;
      return false;
    },
    {
      message:
        'blood_sugar requires value_mg_dl; blood_pressure requires systolic_mm_hg and diastolic_mm_hg',
    }
  );

// ─── Water Logging ─────────────────────────────────────────────────────

export const logWaterSchema = z.object({
  amount_ml: z.number().int().positive().max(5000),
});

// ─── Weight Logging ────────────────────────────────────────────────────

export const logWeightSchema = z.object({
  weight_kg: z.number().positive().max(500),
});

// ─── Type Exports ──────────────────────────────────────────────────────

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type HealthProfileInput = z.infer<typeof healthProfileSchema>;
export type HealthProfilePatchInput = z.infer<typeof healthProfilePatchSchema>;
export type LogMealInput = z.infer<typeof logMealSchema>;
export type HealthReadingInput = z.infer<typeof healthReadingSchema>;
