# PathFinder AI – Backend

AI-powered career path & skill recommendation system for university students and graduates.
The user answers a 20-question questionnaire; the backend matches them to 5 career fields,
estimates their skill gaps and uses AI (Google Gemini) to write a personal 6/9/12-month roadmap.

**Stack:** Supabase (Postgres, Auth, Edge Functions) + Google Gemini.

```
pathfinder-backend/
├── supabase/
│   ├── migrations/20261104000001_schema.sql   ← tables (run 1st)
│   ├── seed.sql                               ← 20 questions + 5 fields content (run 2nd)
│   ├── functions/analyze-profile/
│   │   ├── index.ts                           ← the AI function
│   │   └── scoring.ts                         ← score / skill-gap calculations
│   └── tests/test_answers.sql                 ← fake answers for testing
├── docs/API.md                                ← how the frontend uses the backend
└── README.md
```

---

## Setup (about 20 minutes)

### 1. Create the Supabase project
supabase.com → **New project** → choose a name (e.g. `pathfinder-ai`) and a database password → Create.

### 2. Turn off email confirmation
**Authentication → Sign In / Providers → Email** → turn **off** "Confirm email" → Save.

### 3. Create the tables
**SQL Editor → New query** → paste all of `supabase/migrations/20261104000001_schema.sql` → **Run**.
You should see "Success. No rows returned".

### 4. Add the content
New query → paste all of `supabase/seed.sql` → **Run**.
Check in **Table Editor**: `questions` has 20 rows, `career_fields` has 5.

### 5. Deploy the function
> **Already done** for project `pathfinder-ai` (ref `cwlneejdcuuilfuwrfqz`, Frankfurt), deployed with
> "Verify JWT" **off** because the function checks the login token itself.
> The **AI part is optional** and handled by another team member: without `GEMINI_API_KEY` the function
> still returns scores, skill gaps and ready-made explanation/roadmap text (`"ai_used": false`).
> To turn AI on later, only step 1–2 below are needed; no code change.

1. Get a free Gemini key: https://aistudio.google.com/apikey → **Create API key**.
2. **Edge Functions → Secrets** → add `GEMINI_API_KEY` = your key.
   (Optional: `GEMINI_MODEL`, default is `gemini-flash-latest`.)
3. **Edge Functions → Deploy a new function → Via Editor** → name it **`analyze-profile`**.
   Create two files and paste the code from this repo:
   `index.ts` and `scoring.ts` → **Deploy**.

   *Or with the Supabase CLI:* `supabase login` → `supabase link --project-ref YOUR_REF` →
   `supabase functions deploy analyze-profile`

### 6. Test it
1. **Authentication → Users → Add user**: `test@pathfinder.com` / `Test123456!` (tick *Auto Confirm User*).
2. SQL Editor → run `supabase/tests/test_answers.sql` (should say `answers_saved = 20`).
3. Get a login token and call the function (replace `YOUR-PROJECT` and `YOUR_PUBLIC_KEY`,
   from **Project Settings → API**):

```bash
# log in as the test user -> copy "access_token" from the answer
curl -X POST "https://YOUR-PROJECT.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: YOUR_PUBLIC_KEY" -H "Content-Type: application/json" \
  -d '{"email":"test@pathfinder.com","password":"Test123456!"}'

# call the function
curl -X POST "https://YOUR-PROJECT.supabase.co/functions/v1/analyze-profile" \
  -H "Authorization: Bearer ACCESS_TOKEN" -H "apikey: YOUR_PUBLIC_KEY"
```

You should get the 5 scores and the top 3 matches. Check `"ai_used": true`
(if `false`, the Gemini key is missing or wrong; see **Edge Functions → analyze-profile → Logs**).

### 7. Hand over to the frontend team
Send them `docs/API.md`, the **Project URL** and the **public (anon / publishable) key**.
Never share the service_role / secret key.

---

## How the matching works

The 20 questions are built around **5 career fields**:

| Field | Interests (scale) | Q3 skill | Work style (Q15–17) |
|---|---|---|---|
| Data / Research | Q7, Q9 | Analytical thinking | Analyst |
| Creative / UX | Q5, Q14 | Creativity | Creator |
| People / Operations | Q8, Q13 | Communication | People |
| Technology / Engineering | Q11, Q12 | Technical skills | Builder |
| Business / Entrepreneurship | Q6, Q10 | Leadership | Leader |

**Match % per field** =
40% interests (average of its 2 questions) +
30% work style (Most = +1, Least = −1 over Q15–17) +
20% Q3 skill +
5% field of study (Q1) +
5% curious-about sentence (Q20, classified by AI).

**Skill gap** (3 key skills per field, target 80%): current level =
Q3 rating × 14, + 10 if the field of study matches, + experience from Q4 (max +15).

**AI (Gemini)**: (1) reads the Q20 sentence and picks a field; (2) writes a personal
explanation and a 6/9/12-month roadmap for each of the top 3 fields, based on the skill gaps,
stage (Q2), experience (Q4) and weekly learning time (Q19).
If the AI is unavailable, fallback text is used so the site never breaks.

Weights are in `scoring.ts` (`WEIGHTS`) and the content (careers, skills, environments)
is in `seed.sql`, so both are easy to change.

## Notes
- Row Level Security is **off** (prototype decision). To secure it later: enable RLS on each
  table and add policies like `user_id = auth.uid()`.
- To change questions or careers: edit `seed.sql` and run it again (it keeps users, answers and results).
