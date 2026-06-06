# YeEnat Weg — API Test Plan (0 → all endpoints)

This is a **hands-on, copy-paste test plan for the real server code** in `server/`, not the
idealized spec in `design.md`. Where the code differs from `design.md`, this document follows
the **code**. Read §1 (reality check) before you start so the gaps don't surprise you.

- **Stack (actual):** Node + Express 5 + TypeScript (`tsx`), PostgreSQL via `pg`.
  *(design.md says FastAPI — ignore that, the server is Express.)*
- **Base URL:** `http://localhost:3000/v1`
- **Auth:** Bearer JWT (15 min) + opaque refresh token.
- **DB:** points at a **Neon cloud Postgres** (`server/.env` → `DATABASE_URL`). You do **not**
  need a local Postgres; you just need network access to Neon.

---

## 1. Reality check — what actually works

The OTP and AI are **mocked/partial**. These are the facts that make testing possible:

| Fact | Why it matters for testing |
|---|---|
| `POST /auth/otp/send` is a no-op that always returns success | No SMS. You don't need a real phone. |
| `POST /auth/otp/verify` only accepts the hard-coded OTP **`123456`** | This is your login key. Any other OTP → 400. |
| New users must send `full_name` on verify | First login = registration in one call. |
| **No `ingredients` are seeded** (only 3 `medical_conditions` are) | Ingredient search returns `[]`; substituted meal-logging fails FK **until you seed ingredients** (§4.1). |
| `POST /meal-plans/generate` calls **Gemini** and needs a valid `GEMINI_API_KEY` | May return 500/503 if the key is invalid. Plan flow degrades gracefully — see §7.7. |
| `generate` does **not** insert `meal_plan_slots` (commented out in code) | "followed" meal logging has no slot to point at unless you seed one manually (§4.2). |

### Endpoint coverage (implemented vs. stub vs. design-only)

| Endpoint | Status |
|---|---|
| `GET /v1/health` | ✅ implemented (no auth) |
| `GET /v1/docs`, `GET /v1/docs.json` | ✅ Swagger UI |
| `POST /v1/auth/otp/send` | ✅ (mock) |
| `POST /v1/auth/otp/verify` | ✅ (OTP=`123456`) |
| `POST /v1/auth/refresh` | ✅ |
| `POST /v1/auth/logout` | ✅ |
| `GET /v1/users/me/health-profile` | ✅ |
| `PUT /v1/users/me/health-profile` | ✅ (computes targets; returns `plan_id:"dummy-plan-id"` — does **not** really generate a plan) |
| `PATCH /v1/users/me/health-profile` | ⚠️ stub → **501** |
| `GET /v1/users/me/` , `PATCH /v1/users/me/` | ⚠️ stub → **501** |
| `GET /v1/ingredients` , `GET /v1/ingredients/:id` | ✅ (needs seeded data) |
| `GET /v1/meal-plans/current` | ✅ (404 until a plan exists) |
| `POST /v1/meal-plans/generate` | ✅ (needs profile + working Gemini key) |
| `GET /v1/logs/daily/:date` | ✅ (returns **mocked** totals — numbers are hard-coded) |
| `POST /v1/logs/daily/:date/meals` | ✅ (followed needs a slot; substituted needs ingredients) |
| `POST /v1/logs/daily/:date/water` | ✅ |
| `POST /v1/logs/weight` | ⚠️ stub → **501** |
| `POST /v1/health-readings` | ✅ |
| `GET /v1/health-readings` | ✅ (requires `?type=`) |
| `/auth/google`, `DELETE /users/me`, `/users/me/conditions*`, `/meals/:id`, `/meal-plans/slots/*`, `/meal-plans/:id/days/*`, `DELETE /logs/meals/:id`, `GET /logs/weight`, `/lifestyle/current` | ❌ **not implemented** (in `design.md` only) |

---

## 2. Prerequisites

- Node ≥ 18 (you have v24) and npm.
- Network access to the Neon DB in `server/.env`.
- `curl` (bundled with Git Bash / Windows). `jq` is optional but helps — install or use the
  manual copy-paste fallback shown in §6.

---

## 3. Step 0 — Install & verify config

```bash
cd /d/Enateweeg/EnateWeg/server
npm install
```

Confirm `server/.env` has a real `DATABASE_URL` (Neon) and a `GEMINI_API_KEY` (only needed for
plan generation). The JWT secrets are already set.

> ⚠️ The committed `GEMINI_API_KEY` may be invalid/expired. If `/meal-plans/generate` fails with
> a 500, that's the cause — see §7.7. Everything except plan generation works without it.

---

## 4. Step 1 — Migrate the database (and seed test data)

Create all tables + the 3 medical conditions:

```bash
cd /d/Enateweeg/EnateWeg/server
npm run migrate
```

Expected: `✅ Migration completed successfully!`

### 4.1 Seed a few ingredients (REQUIRED for ingredient + substituted-meal tests)

There is no `seed.ts`. Insert a couple of ingredients directly so the food-search and
substituted-meal-log endpoints have real rows to reference. Run this once:

```bash
psql "$(grep -E '^DATABASE_URL' .env | sed -E "s/^DATABASE_URL=\s*'?//; s/'?\s*$//")" <<'SQL'
INSERT INTO ingredients (name_am, name_en, kcal, protein_g, carb_g, fat_g, fiber_g, sodium_mg, sugar_g, glycemic_index, is_fasting_safe, is_vegetarian, is_vegan, default_serving_g, serving_description)
VALUES
 ('አጃ','Oats',389,16.9,66.3,6.9,10.6,2,0,55,true,true,true,40,'1 cup (40g)'),
 ('እንቁላል','Eggs',155,13,1.1,11,0,124,1.1,0,false,true,false,50,'1 egg (50g)'),
 ('እንጀራ','Injera',130,3.8,25,0.7,2.3,5,0,45,true,true,true,200,'1 medium (200g)')
ON CONFLICT DO NOTHING;
SELECT id, name_en FROM ingredients;
SQL
```

> No `psql`? Run the same `INSERT` from any SQL client connected to the Neon DB, or from the
> Neon web SQL console. **Copy two of the returned `id` UUIDs** — you'll paste them into the
> substituted-meal test in §7.10.

### 4.2 (Optional) Seed a meal + plan slot — needed only for "followed" meal logging

`generate` does not create `meal_plan_slots`, so the "followed" log path (§7.10-A) has nothing to
point at. Skip this unless you specifically want to test that branch. If you do:

```bash
psql "$(grep -E '^DATABASE_URL' .env | sed -E "s/^DATABASE_URL=\s*'?//; s/'?\s*$//")" <<'SQL'
-- Build a planned meal, a plan, a day, and one slot for the FIRST user in the table.
WITH u AS (SELECT id FROM users ORDER BY created_at LIMIT 1),
     m AS (INSERT INTO meals (name_en, meal_type, source) VALUES ('Oats with eggs','breakfast','ai_plan') RETURNING id),
     p AS (INSERT INTO meal_plans (user_id, week_start, profile_version, trigger_reason, status)
           SELECT id, CURRENT_DATE, 1, 'initial', 'active' FROM u RETURNING id),
     d AS (INSERT INTO meal_plan_days (plan_id, plan_date) SELECT id, CURRENT_DATE FROM p RETURNING id)
INSERT INTO meal_plan_slots (day_id, slot_type, meal_id)
SELECT d.id, 'breakfast', m.id FROM d, m
RETURNING id AS slot_id;
SQL
```

Copy the returned `slot_id` for §7.10-A.

---

## 5. Step 2 — Start the server & smoke-test

```bash
cd /d/Enateweeg/EnateWeg/server
npm run dev
```

Expected: `✅ Database connected successfully` then the ASCII banner on port 3000.

In a **second terminal**, confirm it's up:

```bash
curl -s http://localhost:3000/v1/health
```

Expected `200`:
```json
{ "status": "ok", "service": "YeEnat Weg API", "version": "1.0.0-mvp", "timestamp": "..." }
```

Open the interactive docs in a browser: **http://localhost:3000/v1/docs**

---

## 6. Step 3 — Log in and capture a token

This is the gate for every protected endpoint. We register + log in **in one call** (new user).

```bash
# 6a. (optional) "send" the OTP — always succeeds, no SMS
curl -s -X POST http://localhost:3000/v1/auth/otp/send \
  -H 'Content-Type: application/json' \
  -d '{"phone_number":"+251911223344"}'

# 6b. Verify with the hard-coded OTP 123456. full_name is required for a NEW user.
curl -s -X POST http://localhost:3000/v1/auth/otp/verify \
  -H 'Content-Type: application/json' \
  -d '{"phone_number":"+251911223344","otp":"123456","full_name":"Tigist Bekele","preferred_lang":"am"}'
```

Expected `200`:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "....",
  "expires_in": 900,
  "user": { "id": "uuid", "full_name": "Tigist Bekele", "is_new": true }
}
```

**Save the token into a shell variable** so the rest of the commands just work:

```bash
# With jq (recommended):
TOKEN=$(curl -s -X POST http://localhost:3000/v1/auth/otp/verify \
  -H 'Content-Type: application/json' \
  -d '{"phone_number":"+251911223344","otp":"123456","full_name":"Tigist Bekele"}' \
  | jq -r .access_token)
echo "$TOKEN"
```

**No jq?** Run the verify command, copy the `access_token` value by hand, then:
```bash
TOKEN='paste-the-access-token-here'
```

Keep the `refresh_token` too (copy it into `REFRESH=...`) for §7.3.

---

## 7. Step 4 — Test every implemented endpoint (in order)

All protected calls use `-H "Authorization: Bearer $TOKEN"`.

### 7.1 Auth — negative checks
```bash
# Wrong OTP → 400 INVALID_OTP
curl -s -X POST http://localhost:3000/v1/auth/otp/verify \
  -H 'Content-Type: application/json' \
  -d '{"phone_number":"+251911223344","otp":"000000"}'

# Bad phone format → 400 VALIDATION_ERROR
curl -s -X POST http://localhost:3000/v1/auth/otp/verify \
  -H 'Content-Type: application/json' \
  -d '{"phone_number":"abc","otp":"123456"}'

# Existing user logging in again → is_new:false, no full_name needed
curl -s -X POST http://localhost:3000/v1/auth/otp/verify \
  -H 'Content-Type: application/json' \
  -d '{"phone_number":"+251911223344","otp":"123456"}'
```

### 7.2 Auth guard sanity
```bash
# No token → 401 UNAUTHORIZED
curl -s http://localhost:3000/v1/users/me/health-profile

# Garbage token → 401 INVALID_TOKEN
curl -s http://localhost:3000/v1/users/me/health-profile -H 'Authorization: Bearer nonsense'
```

### 7.3 Refresh & logout
```bash
REFRESH='paste-refresh-token-here'

# Rotate access token → 200 with new access_token + new refresh_token
curl -s -X POST http://localhost:3000/v1/auth/refresh \
  -H 'Content-Type: application/json' \
  -d "{\"refresh_token\":\"$REFRESH\"}"

# Logout (revoke) → 204 No Content
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/v1/auth/logout \
  -H 'Content-Type: application/json' \
  -d "{\"refresh_token\":\"$REFRESH\"}"

# Reusing a revoked/old refresh token → 401 INVALID_REFRESH_TOKEN
```
> Note: after refresh, the old refresh token is revoked — use the newest one each time.

### 7.4 Health profile — before it exists
```bash
# 404 NOT_FOUND (no profile yet)
curl -s http://localhost:3000/v1/users/me/health-profile -H "Authorization: Bearer $TOKEN"
```

### 7.5 Create/replace health profile (PUT) — computes targets
```bash
curl -s -X PUT http://localhost:3000/v1/users/me/health-profile \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "sex":"female","birth_year":1986,"height_cm":162,
    "current_weight_kg":72.5,"target_weight_kg":65.0,
    "activity_level":"light","primary_goal":"manage_condition",
    "wake_time":"06:30","sleep_time":"22:30",
    "fasting_type":"orthodox","is_vegetarian":false,
    "allergies":["lactose"],"conditions":["diabetes_t2"]
  }'
```
Expected `200`:
```json
{
  "profile_version": 1,
  "bmi": 27.6,
  "targets": { "kcal": ..., "protein_g": ..., "carb_g": ..., "fat_g": ..., "sodium_mg": ..., "sugar_g": 25 },
  "requires_blood_sugar_tracking": true,
  "plan_id": "dummy-plan-id"
}
```
Checks: `requires_blood_sugar_tracking` is `true` because of `diabetes_t2`; `sugar_g` target is the
tightened `25`. (`plan_id` is a placeholder — a real plan is only created by §7.7.)

Validation negative test → 400:
```bash
curl -s -X PUT http://localhost:3000/v1/users/me/health-profile \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"sex":"alien","birth_year":1986,"height_cm":162,"current_weight_kg":72.5,"primary_goal":"maintain"}'
```

### 7.6 Get health profile (now exists)
```bash
curl -s http://localhost:3000/v1/users/me/health-profile -H "Authorization: Bearer $TOKEN"
```
Expect `200` with the stored profile, computed `bmi`, targets, and `"conditions":["diabetes_t2"]`.

PUT again with different values → `profile_version` should bump to `2`.

### 7.7 Meal plan — generate then read
```bash
# Generate (calls Gemini). Needs the profile from 7.5.
curl -s -X POST http://localhost:3000/v1/meal-plans/generate \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}'
```
- **Success (valid Gemini key):** `200` with `{ "message":"...", "plan_id":"uuid", "plan_data":{ days:[...7], lifestyle:{...} } }`.
  A row is written to `meal_plans` (status `active`) and `lifestyle_plans`.
- **Failure (bad/missing key):** `500 INTERNAL_ERROR` "Failed to generate meal plan from AI".
  This is an environment issue, not a code path you can fix from the client — note it and move on.
- **No profile:** `400 PROFILE_INCOMPLETE`.

```bash
# Read the active plan
curl -s http://localhost:3000/v1/meal-plans/current -H "Authorization: Bearer $TOKEN"
```
- If generation succeeded → `200` `{ plan_id, week_start, trigger_reason, lifestyle }`.
  *(Note: the code does not return `days` here — only plan header + lifestyle. `days` live only in
  the `generate` response.)*
- If no plan exists yet → `404 NOT_FOUND`.

### 7.8 Ingredients (food DB) — needs §4.1 seed
```bash
# Search all
curl -s "http://localhost:3000/v1/ingredients" -H "Authorization: Bearer $TOKEN"

# Search by query + fasting filter + pagination
curl -s "http://localhost:3000/v1/ingredients?q=oat&fasting=true&page=1&limit=20" -H "Authorization: Bearer $TOKEN"
```
Expect `200` `{ "results":[...], "total":N, "page":1 }`. If `results` is empty, you skipped §4.1.

```bash
# Grab one id from the search results, then fetch detail:
ING_ID='paste-an-ingredient-uuid'
curl -s "http://localhost:3000/v1/ingredients/$ING_ID" -H "Authorization: Bearer $TOKEN"

# Unknown id → 404 NOT_FOUND
curl -s "http://localhost:3000/v1/ingredients/00000000-0000-0000-0000-000000000000" -H "Authorization: Bearer $TOKEN"
```

### 7.9 Daily log dashboard (mocked numbers)
```bash
DATE=2026-06-08
curl -s "http://localhost:3000/v1/logs/daily/$DATE" -H "Authorization: Bearer $TOKEN"
```
Expect `200`. **The `targets`/`consumed` numbers are hard-coded mocks** and `entries` is always
`[]` — only `water_ml` reflects real DB state (see §7.11).

### 7.10 Log a meal
**A) Followed the plan** — requires a real `plan_slot_id` (seed it via §4.2 first):
```bash
SLOT_ID='paste-slot-id-from-4.2'
curl -s -X POST "http://localhost:3000/v1/logs/daily/$DATE/meals" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"plan_slot_id\":\"$SLOT_ID\",\"adherence\":\"followed\"}"
```
Expect `201` `{ "message":"Meal logged successfully", "log_id":"uuid" }`. Unknown slot → `404`.

**B) Substituted** — insert the ingredients you actually ate (use two ids from §4.1):
```bash
ING1='paste-ingredient-uuid-1'
ING2='paste-ingredient-uuid-2'
curl -s -X POST "http://localhost:3000/v1/logs/daily/$DATE/meals" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{
    \"adherence\":\"substituted\",
    \"slot_type\":\"breakfast\",
    \"meal\":{\"name_en\":\"Firfir & tea\",\"items\":[
      {\"ingredient_id\":\"$ING1\",\"quantity_g\":200},
      {\"ingredient_id\":\"$ING2\",\"quantity_g\":150}
    ]}
  }"
```
Expect `201`. A bogus `ingredient_id` (valid UUID, no row) → `500` (FK violation) — expected.

Validation negative → 400 (substituted with empty items / missing slot_type).

### 7.11 Log water (real persistence)
```bash
curl -s -X POST "http://localhost:3000/v1/logs/daily/$DATE/water" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"amount_ml":250}'
```
Expect `201`. Call it twice, then re-run §7.9 — `water_ml` should **accumulate** (250 → 500).
`amount_ml` over 5000 or non-positive → 400.

### 7.12 Blood-sugar reading (may flag plan)
```bash
# High fasting reading (>140) → status:"high", plan_updated:true
curl -s -X POST http://localhost:3000/v1/health-readings \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"reading_type":"blood_sugar","value_mg_dl":184,"context":"fasting"}'

# Normal reading → status:"normal", plan_updated:false
curl -s -X POST http://localhost:3000/v1/health-readings \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"reading_type":"blood_sugar","value_mg_dl":95,"context":"fasting"}'

# Blood pressure reading
curl -s -X POST http://localhost:3000/v1/health-readings \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"reading_type":"blood_pressure","systolic_mm_hg":140,"diastolic_mm_hg":90}'

# Cross-field validation: blood_sugar without value_mg_dl → 400
curl -s -X POST http://localhost:3000/v1/health-readings \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"reading_type":"blood_sugar","context":"fasting"}'
```
> `plan_updated:true` only flips `meal_plans.trigger_reason='blood_sugar'`; `new_plan_id` is a
> placeholder string (`"dummy-new-plan-id"`) — no real regeneration happens yet.

### 7.13 Read reading history (`?type` is required)
```bash
curl -s "http://localhost:3000/v1/health-readings?type=blood_sugar&days=30" -H "Authorization: Bearer $TOKEN"
```
Expect `200` with an array, newest first. **Omitting `?type=` returns an empty array** (the query
filters on `reading_type = undefined`), so always pass it.

### 7.14 Stubs — confirm they return 501
```bash
for ep in \
  "PATCH /users/me/health-profile" \
  "GET /users/me/" \
  "PATCH /users/me/" ; do
  m=${ep% *}; p=${ep#* }
  echo -n "$ep -> "
  curl -s -o /dev/null -w '%{http_code}\n' -X "$m" "http://localhost:3000/v1$p" -H "Authorization: Bearer $TOKEN"
done

# Weight logging stub → 501
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/v1/logs/weight -H "Authorization: Bearer $TOKEN" -d '{}'
```
Expect `501` for each.

### 7.15 404 handler
```bash
curl -s http://localhost:3000/v1/does-not-exist -H "Authorization: Bearer $TOKEN"
```
Expect `404` with `{ "error": { "code":"NOT_FOUND", ... } }`.

---

## 8. End-to-end happy path (the MVP loop)

Run these in sequence to exercise the full core loop:

1. `POST /auth/otp/verify` (otp `123456`, with `full_name`) → save `TOKEN`. *(register + login)*
2. `PUT /users/me/health-profile` → targets + `requires_blood_sugar_tracking`.
3. `POST /meal-plans/generate` → real plan (if Gemini key valid).
4. `GET /meal-plans/current` → plan header + lifestyle.
5. `POST /logs/daily/{date}/meals` (substituted, real ingredient ids from §4.1) → `201`.
6. `POST /logs/daily/{date}/water` → `201`, accumulates.
7. `GET /logs/daily/{date}` → dashboard (water real; totals mocked).
8. `POST /health-readings` (high fasting sugar) → `plan_updated:true`.
9. `GET /health-readings?type=blood_sugar` → history.

---

## 9. Quick status-code reference (what "pass" looks like)

| Scenario | Expected |
|---|---|
| Valid create | `200` / `201` |
| Logout | `204` |
| Bad body / bad query | `400` (`VALIDATION_ERROR`) |
| Missing/invalid/expired token | `401` |
| Resource missing (profile, plan, ingredient, slot) | `404` |
| Not-implemented stub | `501` |
| Gemini down / FK violation | `500` |

---

## 10. Troubleshooting

- **`Database connection failed` on startup** → bad/blocked `DATABASE_URL`. The value in `.env` is
  wrapped in quotes with a leading space; dotenv tolerates this, but if connection fails, clean it
  to `DATABASE_URL=postgresql://...` (no quotes, no leading space).
- **All protected calls 401** → `TOKEN` empty/expired (access token lasts 15 min). Re-run §6 or use
  `/auth/refresh`.
- **Ingredient search returns `[]` / substituted log 500s** → you skipped the §4.1 seed.
- **`/meal-plans/generate` 500** → invalid `GEMINI_API_KEY`. Get a key from Google AI Studio, set
  `GEMINI_API_KEY` + `GEMINI_MODEL=gemini-2.5-flash` in `.env`, restart. Other endpoints don't need it.
- **`/meal-plans/current` 404** → no successful `generate` yet (or it failed at the AI step).
- **"followed" meal log 404** → no `meal_plan_slots` exist; seed one via §4.2 or use the
  substituted path instead.
- **Reading history empty** → you forgot `?type=blood_sugar`.
```
