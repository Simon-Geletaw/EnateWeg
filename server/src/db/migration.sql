-- ============================================================
-- YeEnat Weg — MVP Database Migration
-- Creates all tables, indexes, and seed data for the core loop.
-- ============================================================

-- ─── 1.1 Users & Authentication ───────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number    VARCHAR(20) UNIQUE,
    google_uid      VARCHAR(128) UNIQUE,
    full_name       VARCHAR(120) NOT NULL,
    preferred_lang  VARCHAR(10) NOT NULL DEFAULT 'am',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS otp_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       VARCHAR(20) NOT NULL,
    otp_hash    VARCHAR(128) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(256) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 1.2 Health Profile ───────────────────────────────────

CREATE TABLE IF NOT EXISTS health_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    sex                 VARCHAR(10) NOT NULL,
    birth_year          SMALLINT NOT NULL,
    height_cm           NUMERIC(5,1) NOT NULL,
    current_weight_kg   NUMERIC(5,1) NOT NULL,
    target_weight_kg    NUMERIC(5,1),
    bmi                 NUMERIC(4,1) GENERATED ALWAYS AS
                            (current_weight_kg / ((height_cm/100)*(height_cm/100))) STORED,

    activity_level      VARCHAR(20) NOT NULL DEFAULT 'sedentary',
    primary_goal        VARCHAR(30) NOT NULL,

    wake_time           TIME,
    sleep_time          TIME,

    fasting_type        VARCHAR(20) NOT NULL DEFAULT 'none',
    is_vegetarian       BOOLEAN NOT NULL DEFAULT FALSE,
    is_vegan            BOOLEAN NOT NULL DEFAULT FALSE,
    allergies           TEXT[] NOT NULL DEFAULT '{}',

    daily_kcal_target   SMALLINT,
    protein_g_target    SMALLINT,
    carb_g_target       SMALLINT,
    fat_g_target        SMALLINT,
    sodium_mg_target    SMALLINT,
    sugar_g_target      SMALLINT,

    profile_version     INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medical_conditions (
    id      SMALLSERIAL PRIMARY KEY,
    code    VARCHAR(30) UNIQUE NOT NULL,
    label   VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_conditions (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    condition_id    SMALLINT NOT NULL REFERENCES medical_conditions(id),
    diagnosed_at    DATE,
    PRIMARY KEY (user_id, condition_id)
);

-- ─── 1.3 Ingredients ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS ingredients (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_am             VARCHAR(120) NOT NULL,
    name_en             VARCHAR(120) NOT NULL,

    kcal                NUMERIC(6,1) NOT NULL,
    protein_g           NUMERIC(5,2) NOT NULL,
    carb_g              NUMERIC(5,2) NOT NULL,
    fat_g               NUMERIC(5,2) NOT NULL,
    fiber_g             NUMERIC(5,2),
    sodium_mg           NUMERIC(6,1),
    sugar_g             NUMERIC(5,2),
    glycemic_index      SMALLINT,

    is_fasting_safe     BOOLEAN NOT NULL DEFAULT FALSE,
    is_vegetarian       BOOLEAN NOT NULL DEFAULT FALSE,
    is_vegan            BOOLEAN NOT NULL DEFAULT FALSE,

    default_serving_g   NUMERIC(6,1) NOT NULL DEFAULT 100,
    serving_description VARCHAR(100),

    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 1.4 Meals ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_am         VARCHAR(150),
    name_en         VARCHAR(150),
    meal_type       VARCHAR(20) NOT NULL,
    source          VARCHAR(20) NOT NULL,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,

    total_kcal      NUMERIC(7,1) NOT NULL DEFAULT 0,
    total_protein_g NUMERIC(6,2) NOT NULL DEFAULT 0,
    total_carb_g    NUMERIC(6,2) NOT NULL DEFAULT 0,
    total_fat_g     NUMERIC(6,2) NOT NULL DEFAULT 0,
    total_fiber_g   NUMERIC(6,2),
    total_sodium_mg NUMERIC(7,1),
    total_sugar_g   NUMERIC(6,2),
    glycemic_load   NUMERIC(6,2),

    is_fasting_safe BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id         UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    ingredient_id   UUID NOT NULL REFERENCES ingredients(id),
    quantity_g      NUMERIC(7,2) NOT NULL,
    UNIQUE (meal_id, ingredient_id)
);

-- ─── 1.5 Meal Plan ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS meal_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start      DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    profile_version INTEGER NOT NULL,
    trigger_reason  VARCHAR(30) NOT NULL DEFAULT 'initial',
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_plan
    ON meal_plans (user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS meal_plan_days (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id     UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    plan_date   DATE NOT NULL,
    day_kcal_target NUMERIC(7,1),
    UNIQUE (plan_id, plan_date)
);

CREATE TABLE IF NOT EXISTS meal_plan_slots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id      UUID NOT NULL REFERENCES meal_plan_days(id) ON DELETE CASCADE,
    slot_type   VARCHAR(20) NOT NULL,
    slot_index  SMALLINT NOT NULL DEFAULT 0,
    meal_id     UUID NOT NULL REFERENCES meals(id),
    is_logged   BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (day_id, slot_type, slot_index)
);

-- ─── 1.6 Logging ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date    DATE NOT NULL,
    water_ml    SMALLINT NOT NULL DEFAULT 0,
    UNIQUE (user_id, log_date)
);

CREATE TABLE IF NOT EXISTS meal_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_log_id    UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    slot_type       VARCHAR(20) NOT NULL,
    plan_slot_id    UUID REFERENCES meal_plan_slots(id) ON DELETE SET NULL,
    meal_id         UUID NOT NULL REFERENCES meals(id),
    adherence       VARCHAR(20) NOT NULL,
    logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weight_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight_kg   NUMERIC(5,1) NOT NULL,
    logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health_readings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reading_type     VARCHAR(20) NOT NULL,

    value_mg_dl      NUMERIC(6,1),
    systolic_mm_hg   SMALLINT,
    diastolic_mm_hg  SMALLINT,

    context          VARCHAR(20) NOT NULL DEFAULT 'random',
    measured_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note             TEXT,
    CONSTRAINT chk_reading_value CHECK (
        (reading_type = 'blood_sugar'    AND value_mg_dl IS NOT NULL) OR
        (reading_type = 'blood_pressure' AND systolic_mm_hg IS NOT NULL
                                         AND diastolic_mm_hg IS NOT NULL)
    )
);

-- ─── 1.7 Lifestyle ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS lifestyle_plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_plan_id        UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
    status              VARCHAR(20) NOT NULL DEFAULT 'active',

    sleep_target_start  TIME,
    sleep_target_end    TIME,
    sleep_note_am       TEXT,
    sleep_note_en       TEXT,

    exercise_suggestions JSONB NOT NULL DEFAULT '[]',

    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_lifestyle
    ON lifestyle_plans (user_id) WHERE status = 'active';

-- ─── 1.8 Indexes ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ingredients_fasting   ON ingredients (is_fasting_safe, is_active);
CREATE INDEX IF NOT EXISTS idx_ingredients_fts       ON ingredients
    USING gin (to_tsvector('simple', name_am || ' ' || name_en));
CREATE INDEX IF NOT EXISTS idx_meal_items_meal       ON meal_items (meal_id);
CREATE INDEX IF NOT EXISTS idx_plan_days_plan        ON meal_plan_days (plan_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_plan_slots_day        ON meal_plan_slots (day_id, slot_type);
CREATE INDEX IF NOT EXISTS idx_meal_logs_daily       ON meal_logs (daily_log_id, slot_type);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user      ON weight_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_readings_user  ON health_readings (user_id, reading_type, measured_at DESC);

-- ─── Seed: Medical Conditions ─────────────────────────────

INSERT INTO medical_conditions (code, label) VALUES
    ('diabetes_t1',   'Type 1 Diabetes'),
    ('diabetes_t2',   'Type 2 Diabetes'),
    ('hypertension',  'Hypertension (High Blood Pressure)')
ON CONFLICT (code) DO NOTHING;

-- Done!
SELECT 'YeEnat Weg MVP schema created successfully.' AS result;
