# PathFinder AI – Backend API (for the frontend team)

The backend is **Supabase**. The frontend talks to it with the
[`supabase-js`](https://supabase.com/docs/reference/javascript) library
(works with React, Next.js, Vue or plain JavaScript).

```bash
npm install @supabase/supabase-js
```

```js
import { createClient } from "@supabase/supabase-js";

// Dashboard -> Project Settings -> API (use the URL and the public / publishable key)
export const supabase = createClient("https://YOUR-PROJECT.supabase.co", "YOUR_PUBLIC_KEY");
```

> Never put the `service_role` / secret key in the frontend.

---

## Page by page

| Page | What to call |
|---|---|
| Landing | nothing (Get Started → Sign up page) |
| Sign up | `auth.signUp` |
| Log in | `auth.signInWithPassword` |
| Header avatar ("S") | `profiles.full_name` |
| Questionnaire intro | `sections` |
| Questions 1–20 | `questions` + `question_options`, save to `answers` |
| Analyzing… (loading) | `functions.invoke("analyze-profile")` |
| Results | response of the function, or `results` + `result_details` |
| View details | `result_details` + `career_fields` (careers, work environments) |
| Save results / Save to my profile | update `results.is_saved` |
| Share | link with `results.share_id` |
| My results | `results` of the user |

---

## 1. Sign up / Log in

```js
// Sign up ("Create your account") -> then go to the questionnaire
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name: fullName } }, // saved into the profiles table automatically
});
// error.message is ready to show, e.g. "User already registered"

// Log in
await supabase.auth.signInWithPassword({ email, password });

// Current user / log out
const { data: { user } } = await supabase.auth.getUser();
await supabase.auth.signOut();
```

> Email confirmation must be **off** (Dashboard → Authentication → Sign In / Providers → Email → "Confirm email" off),
> so the user goes straight to the questionnaire after sign-up.

## 2. Profile (header avatar)

```js
const { data: profile } = await supabase
  .from("profiles").select("full_name, email").eq("id", user.id).single();
const initial = profile.full_name?.[0]?.toUpperCase(); // "S"
```

## 3. Questionnaire

### Load sections and all 20 questions with their options

```js
const { data: sections } = await supabase.from("sections").select("*").order("sort_order");

const { data: questions } = await supabase
  .from("questions")
  .select("*, question_options(code, label, sort_order)")
  .order("id");
// sort options: q.question_options.sort((a, b) => a.sort_order - b.sort_order)
```

Each question has a `type`, which tells you which component to show:

| type | Questions | Component | `settings` |
|---|---|---|---|
| `dropdown` | 1 | select box | – |
| `single_choice` | 2, 19 | radio cards | – |
| `rating_grid` | 3 | rows (= options) × 1–5 buttons | `{"min":1,"max":5}` |
| `multi_select` | 4 | checkbox cards | – |
| `scale` | 5–14 | one 1–5 scale | `{"min":1,"max":5,"min_label":"Not at all","max_label":"A lot"}` |
| `most_least` | 15–17 | Most / Least buttons per option (order can be shuffled) | – |
| `ranking` | 18 | click in order, pick 3 | `{"count":3}` |
| `text` | 20 | text box, optional (`required = false`) | `{"max_length":300}` |

### Save an answer (call it on every "Next")

```js
await supabase.from("answers").upsert(
  { user_id: user.id, question_id: q.id, value: answerValue },
  { onConflict: "user_id,question_id" }
);
```

### The format of `value` for each type (important!)

Always save the option **`code`**, not the label.

| type | Example `value` |
|---|---|
| `dropdown`, `single_choice` | `"computer_science"` |
| `rating_grid` | `{"communication":3,"analytical":4,"technical":3,"creativity":4,"leadership":2}` |
| `multi_select` | `["internship","online_courses"]` |
| `scale` | `4` (a number) |
| `most_least` | `{"most":["facts_data"],"least":["set_goals"]}` (at least 1 in each; an option can't be in both) |
| `ranking` | `["high_salary","job_stability","helping_others"]` (in order) |
| `text` | `"I am curious about cyber security"` or `null` if skipped |

### Load saved answers (for "Back", or to continue later)

```js
const { data: answers } = await supabase
  .from("answers").select("question_id, value").eq("user_id", user.id);
```

## 4. "See results" → analyze

Show the **"Analyzing your profile…"** page, then:

```js
const { data, error } = await supabase.functions.invoke("analyze-profile", { method: "POST" });
```

Takes about 3–10 seconds (AI). If some answers are missing you get status 400 with
`{ "error": "...", "missing_questions": [3, 15] }`.

**Response:**

```json
{
  "result_id": "uuid",
  "share_id": "uuid",
  "created_at": "2026-11-04T15:00:00Z",
  "ai_used": true,
  "scores": [
    { "code": "data",     "name": "Data / Research",             "short_label": "Data",     "score": 80 },
    { "code": "creative", "name": "Creative / UX",               "short_label": "Creative", "score": 60 },
    { "code": "people",   "name": "People / Operations",         "short_label": "People",   "score": 45 },
    { "code": "tech",     "name": "Technology / Engineering",    "short_label": "Tech",     "score": 55 },
    { "code": "business", "name": "Business / Entrepreneurship", "short_label": "Business", "score": 15 }
  ],
  "top_matches": [
    {
      "rank": 1,
      "code": "data",
      "name": "Data / Research",
      "match_percent": 80,
      "explanation": "You love finding patterns and answers in evidence.",
      "skill_gaps": [
        { "skill": "SQL & Excel", "current": 50, "target": 80 },
        { "skill": "Statistics", "current": 64, "target": 80 },
        { "skill": "Data visualization", "current": 64, "target": 80 }
      ],
      "roadmap": [
        { "months": 6,  "step": "Learn SQL and advanced Excel" },
        { "months": 9,  "step": "Complete 2 analysis projects with public data" },
        { "months": 12, "step": "Build a dashboard portfolio and apply" }
      ]
    }
  ]
}
```

- **Your top matches** → `top_matches` (3 cards)
- **Radar chart + Field breakdown** → `scores` (all 5; sort by `score` for the breakdown)
- The "Prototype scoring…" note can be removed.

## 5. View details page

The function response already has explanation, skill gaps and roadmap.
Careers and work environments come from the content tables:

```js
const { data: field } = await supabase
  .from("career_fields")
  .select("code, name, careers(title, sort_order), work_environments(name, sort_order)")
  .eq("code", "data")
  .single();
```

To open the details later (e.g. from "My results"):

```js
const { data: detail } = await supabase
  .from("result_details").select("*")
  .eq("result_id", resultId).eq("field_code", "data").single();
```

## 6. Save results / Save to my profile

```js
await supabase.from("results").update({ is_saved: true }).eq("id", resultId);
```

## 7. Share

Build a link like `https://your-site.com/share/<share_id>` and on that page load:

```js
const { data: result } = await supabase
  .from("results")
  .select("scores, top_fields, created_at, result_details(*)")
  .eq("share_id", shareId)
  .single();
```

## 8. My results (history)

```js
const { data: myResults } = await supabase
  .from("results")
  .select("id, scores, top_fields, is_saved, created_at")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });
// only saved ones: add .eq("is_saved", true)
```

## 9. Back to start

Go to the questionnaire again. The old answers are loaded (section 3), the user changes
what they want, and "See results" creates a **new** result. Old results stay in history.
