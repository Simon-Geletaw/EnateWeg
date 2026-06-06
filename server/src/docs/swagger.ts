import swaggerJSDoc from 'swagger-jsdoc';
import { env } from '../config/env';

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'YeEnat Weg API',
      version: '1.0.0',
      description: 'API documentation for authentication, profile, ingredients, meal plans, logs, and health readings.',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Local development server',
      },
    ],
    tags: [
      { name: 'Health', description: 'Service health endpoints' },
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Profile', description: 'User and health profile endpoints' },
      { name: 'Ingredients', description: 'Ingredient endpoints' },
      { name: 'Meal Plans', description: 'Meal plan endpoints' },
      { name: 'Logs', description: 'Daily logging endpoints' },
      { name: 'Health Readings', description: 'Health reading endpoints' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message_am: { type: 'string', example: 'የግቤት ስህተት።' },
                message_en: { type: 'string', example: 'Validation error.' },
                detail: { nullable: true },
              },
              required: ['code', 'message_am', 'message_en', 'detail'],
            },
          },
          required: ['error'],
        },
        SendOtpRequest: {
          type: 'object',
          properties: {
            phone_number: { type: 'string', example: '+251911223344' },
          },
          required: ['phone_number'],
        },
        VerifyOtpRequest: {
          type: 'object',
          properties: {
            phone_number: { type: 'string', example: '+251911223344' },
            otp: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
            full_name: { type: 'string', example: 'Abebe Bekele' },
            preferred_lang: { type: 'string', enum: ['am', 'en'], example: 'am' },
          },
          required: ['phone_number', 'otp'],
        },
        RefreshTokenRequest: {
          type: 'object',
          properties: {
            refresh_token: { type: 'string', example: 'refresh-token-value' },
          },
          required: ['refresh_token'],
        },
        LogoutRequest: {
          type: 'object',
          properties: {
            refresh_token: { type: 'string', example: 'refresh-token-value' },
          },
        },
        AuthTokensResponse: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            refresh_token: { type: 'string' },
            expires_in: { type: 'number', example: 900 },
          },
          required: ['access_token', 'refresh_token', 'expires_in'],
        },
        VerifyOtpResponse: {
          allOf: [
            { $ref: '#/components/schemas/AuthTokensResponse' },
            {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    full_name: { type: 'string' },
                    is_new: { type: 'boolean' },
                  },
                  required: ['id', 'full_name', 'is_new'],
                },
              },
              required: ['user'],
            },
          ],
        },
        HealthProfileRequest: {
          type: 'object',
          properties: {
            sex: { type: 'string', enum: ['male', 'female', 'other'] },
            birth_year: { type: 'integer', example: 1995 },
            height_cm: { type: 'number', example: 172 },
            current_weight_kg: { type: 'number', example: 76 },
            target_weight_kg: { type: 'number', example: 70 },
            activity_level: { type: 'string', enum: ['sedentary', 'light', 'moderate', 'active'] },
            primary_goal: {
              type: 'string',
              enum: ['lose_weight', 'gain_weight', 'maintain', 'manage_condition'],
            },
            wake_time: { type: 'string', example: '06:30' },
            sleep_time: { type: 'string', example: '22:30' },
            fasting_type: { type: 'string', enum: ['none', 'orthodox', 'ramadan'] },
            is_vegetarian: { type: 'boolean', example: false },
            is_vegan: { type: 'boolean', example: false },
            allergies: {
              type: 'array',
              items: { type: 'string' },
              example: ['peanut'],
            },
            conditions: {
              type: 'array',
              items: { type: 'string' },
              example: ['diabetes_t2'],
            },
          },
          required: [
            'sex',
            'birth_year',
            'height_cm',
            'current_weight_kg',
            'activity_level',
            'primary_goal',
            'fasting_type',
            'is_vegetarian',
            'is_vegan',
            'allergies',
            'conditions',
          ],
        },
        HealthProfileUpsertResponse: {
          type: 'object',
          properties: {
            profile_version: { type: 'integer', example: 2 },
            bmi: { type: 'number', example: 25.7 },
            targets: {
              type: 'object',
              additionalProperties: true,
            },
            requires_blood_sugar_tracking: { type: 'boolean' },
            plan_id: { type: 'string', nullable: true, format: 'uuid' },
            plan_generation_status: {
              type: 'string',
              enum: ['generated', 'failed'],
              example: 'generated',
            },
          },
          required: [
            'profile_version',
            'bmi',
            'targets',
            'requires_blood_sugar_tracking',
            'plan_id',
            'plan_generation_status',
          ],
        },
        IngredientSearchResponse: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: true,
              },
            },
            total: { type: 'integer', example: 42 },
            page: { type: 'integer', example: 1 },
          },
          required: ['results', 'total', 'page'],
        },
        FollowedMealLogRequest: {
          type: 'object',
          properties: {
            adherence: { type: 'string', enum: ['followed'] },
            plan_slot_id: { type: 'string', format: 'uuid' },
          },
          required: ['adherence', 'plan_slot_id'],
        },
        SubstitutedMealLogRequest: {
          type: 'object',
          properties: {
            adherence: { type: 'string', enum: ['substituted'] },
            plan_slot_id: { type: 'string', format: 'uuid' },
            slot_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
            meal: {
              type: 'object',
              properties: {
                name_en: { type: 'string' },
                name_am: { type: 'string' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      ingredient_id: { type: 'string', format: 'uuid' },
                      quantity_g: { type: 'number' },
                    },
                    required: ['ingredient_id', 'quantity_g'],
                  },
                },
              },
              required: ['name_en', 'items'],
            },
          },
          required: ['adherence', 'slot_type', 'meal'],
        },
        LogWaterRequest: {
          type: 'object',
          properties: {
            amount_ml: { type: 'integer', example: 250 },
          },
          required: ['amount_ml'],
        },
        HealthReadingRequest: {
          type: 'object',
          properties: {
            reading_type: { type: 'string', enum: ['blood_sugar', 'blood_pressure'] },
            value_mg_dl: { type: 'number', example: 118 },
            systolic_mm_hg: { type: 'integer', example: 120 },
            diastolic_mm_hg: { type: 'integer', example: 80 },
            context: {
              type: 'string',
              enum: ['fasting', 'pre_meal', 'post_meal', 'random'],
              example: 'fasting',
            },
            note: { type: 'string', example: 'Before breakfast' },
          },
          required: ['reading_type'],
        },
      },
    },
    paths: {
      '/v1/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: {
            '200': {
              description: 'Service health info',
            },
          },
        },
      },
      '/v1/auth/otp/send': {
        post: {
          tags: ['Auth'],
          summary: 'Send OTP to phone number',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SendOtpRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'OTP accepted for delivery',
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/v1/auth/otp/verify': {
        post: {
          tags: ['Auth'],
          summary: 'Verify OTP and issue tokens',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VerifyOtpRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Authenticated successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/VerifyOtpResponse' },
                },
              },
            },
            '400': {
              description: 'Invalid OTP or validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/v1/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'New access and refresh tokens',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthTokensResponse' },
                },
              },
            },
            '401': {
              description: 'Invalid refresh token',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/v1/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout and revoke refresh token',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LogoutRequest' },
              },
            },
          },
          responses: {
            '204': {
              description: 'Logged out',
            },
          },
        },
      },
      '/v1/users/me/health-profile': {
        get: {
          tags: ['Profile'],
          summary: 'Get current user health profile',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Health profile',
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'Health profile not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
        put: {
          tags: ['Profile'],
          summary: 'Create or update health profile',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthProfileRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Profile upsert result',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthProfileUpsertResponse' },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
        patch: {
          tags: ['Profile'],
          summary: 'Patch health profile (not implemented)',
          security: [{ bearerAuth: [] }],
          responses: {
            '501': { description: 'Not implemented' },
          },
        },
      },
      '/v1/users/me': {
        get: {
          tags: ['Profile'],
          summary: 'Get current user details (not implemented)',
          security: [{ bearerAuth: [] }],
          responses: {
            '501': { description: 'Not implemented' },
          },
        },
        patch: {
          tags: ['Profile'],
          summary: 'Patch current user details (not implemented)',
          security: [{ bearerAuth: [] }],
          responses: {
            '501': { description: 'Not implemented' },
          },
        },
      },
      '/v1/ingredients': {
        get: {
          tags: ['Ingredients'],
          summary: 'Search ingredients',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description: 'Search text against Amharic and English names',
            },
            {
              name: 'fasting',
              in: 'query',
              required: false,
              schema: { type: 'boolean' },
              description: 'Filter fasting-safe ingredients',
            },
            {
              name: 'page',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, default: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, default: 20 },
            },
          ],
          responses: {
            '200': {
              description: 'Ingredient search result',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/IngredientSearchResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/v1/ingredients/{id}': {
        get: {
          tags: ['Ingredients'],
          summary: 'Get ingredient by id',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: 'Ingredient found',
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'Ingredient not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/v1/meal-plans/current': {
        get: {
          tags: ['Meal Plans'],
          summary: 'Get active meal plan',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Current meal plan summary',
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'No active plan',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/v1/meal-plans/current/weekly': {
        get: {
          tags: ['Meal Plans'],
          summary: 'Get active weekly meal plan for calendar view',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Active weekly meal plan with days, slots, meals, and items',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      plan_id: { type: 'string', format: 'uuid' },
                      week_start: { type: 'string', format: 'date' },
                      trigger_reason: { type: 'string' },
                      generated_at: { type: 'string', format: 'date-time' },
                      lifestyle: {
                        type: 'object',
                        nullable: true,
                        additionalProperties: true,
                      },
                      days: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            day_id: { type: 'string', format: 'uuid' },
                            date: { type: 'string', format: 'date' },
                            day_kcal_target: { type: 'number', nullable: true },
                            slots: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  slot_id: { type: 'string', format: 'uuid' },
                                  slot_type: {
                                    type: 'string',
                                    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
                                  },
                                  slot_index: { type: 'integer' },
                                  is_logged: { type: 'boolean' },
                                  meal: {
                                    type: 'object',
                                    nullable: true,
                                    properties: {
                                      id: { type: 'string', format: 'uuid' },
                                      name_en: { type: 'string', nullable: true },
                                      name_am: { type: 'string', nullable: true },
                                      source: { type: 'string', nullable: true },
                                      total_kcal: { type: 'number', nullable: true },
                                      items: {
                                        type: 'array',
                                        items: {
                                          type: 'object',
                                          properties: {
                                            item_id: { type: 'string', format: 'uuid' },
                                            ingredient_id: {
                                              type: 'string',
                                              format: 'uuid',
                                              nullable: true,
                                            },
                                            ingredient_name_en: { type: 'string', nullable: true },
                                            ingredient_name_am: { type: 'string', nullable: true },
                                            quantity_g: { type: 'number', nullable: true },
                                          },
                                          required: ['item_id'],
                                        },
                                      },
                                    },
                                    required: ['id', 'items'],
                                  },
                                },
                                required: ['slot_id', 'slot_type', 'slot_index', 'is_logged', 'meal'],
                              },
                            },
                          },
                          required: ['day_id', 'date', 'slots'],
                        },
                      },
                    },
                    required: ['plan_id', 'week_start', 'trigger_reason', 'generated_at', 'days'],
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'No active plan',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/v1/meal-plans/generate': {
        post: {
          tags: ['Meal Plans'],
          summary: 'Generate a new meal plan',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    trigger_reason: { type: 'string', example: 'initial' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Plan generated',
            },
            '400': {
              description: 'Health profile incomplete',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/v1/logs/daily/{date}': {
        get: {
          tags: ['Logs'],
          summary: 'Get daily logs summary',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'date',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'date', example: '2026-06-06' },
            },
          ],
          responses: {
            '200': {
              description: 'Daily summary',
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/v1/logs/daily/{date}/meals': {
        post: {
          tags: ['Logs'],
          summary: 'Log meal for a day',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'date',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'date', example: '2026-06-06' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/FollowedMealLogRequest' },
                    { $ref: '#/components/schemas/SubstitutedMealLogRequest' },
                  ],
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Meal log created',
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'Plan slot not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/v1/logs/daily/{date}/water': {
        post: {
          tags: ['Logs'],
          summary: 'Log water intake for a day',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'date',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'date', example: '2026-06-06' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LogWaterRequest' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Water log created',
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/v1/logs/weight': {
        post: {
          tags: ['Logs'],
          summary: 'Log weight (not implemented)',
          security: [{ bearerAuth: [] }],
          responses: {
            '501': { description: 'Not implemented' },
          },
        },
      },
      '/v1/health-readings': {
        post: {
          tags: ['Health Readings'],
          summary: 'Log health reading',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthReadingRequest' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Health reading created',
            },
            '400': {
              description: 'Validation or business error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
        get: {
          tags: ['Health Readings'],
          summary: 'List health readings by type and date range',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'type',
              in: 'query',
              required: true,
              schema: { type: 'string', enum: ['blood_sugar', 'blood_pressure'] },
            },
            {
              name: 'days',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, default: 30 },
            },
          ],
          responses: {
            '200': {
              description: 'Health readings list',
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
