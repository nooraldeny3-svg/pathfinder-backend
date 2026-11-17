# PathFinder AI – Frontend (React + Vite)

The website. It talks **directly to Supabase** (no separate server needed).

## Run it

```bash
cd client
npm install
npm run dev
```

Open the link it prints (usually http://localhost:5173).
Test account: `test@pathfinder.com` / `Test123456!` (or create a new one with Sign up).

## Pages

| URL | Page | Backend used |
|---|---|---|
| `/` | Landing | – |
| `/register`, `/login` | Sign up / Log in | Supabase Auth (profile row is created automatically) |
| `/start` | "Before you start" (4 sections) | `sections`, `questions`, `answers` |
| `/questionnaire/1` … `/20` | One question per page, saved on **Next** | `questions` + `question_options`, upsert into `answers` |
| `/analyzing` | "Analyzing your profile…" | Edge Function `analyze-profile` |
| `/results/:id` | Top 3 matches, radar chart, field breakdown, Share, Save | `results` + `result_details`, `career_fields` |
| `/results/:id/:field` | View details: careers, environments, skill gap, roadmap | `result_details`, `careers`, `work_environments` |
| `/my-results` | History of all results | `results` |
| `/share/:shareId` | Public page opened from a Share link | `results` (by `share_id`) |

## Files

- `src/supabase.js` – the Supabase connection (URL + public key; can be overridden with `.env`, see `.env.example`)
- `src/AuthContext.jsx` – sign up / log in / log out with Supabase Auth
- `src/questionnaire.js` – load questions and save answers
- `src/results.js` – run the analysis and load results
- `src/components/QuestionInput.jsx` – the 8 question types (dropdown, single choice, rating grid, multi-select, scale, most/least, ranking, text)
- `src/components/ResultView.jsx` – match cards, radar chart, field breakdown
