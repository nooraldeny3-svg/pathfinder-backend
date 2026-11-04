// =====================================================================
// PathFinder AI - scoring logic (no AI here, pure calculations)
// Kept in its own file so it can be tested and explained easily.
// =====================================================================

export type FieldCode = "data" | "creative" | "people" | "tech" | "business";
export const FIELD_CODES: FieldCode[] = ["data", "creative", "people", "tech", "business"];

export interface CareerField {
  code: FieldCode;
  name: string;
  short_label: string;
  description: string;
  q3_skill: string; // related skill in Q3
}

export interface FieldSkill {
  field_code: FieldCode;
  name: string;
  base_skill: string; // Q3 skill used to estimate it
  target: number;
}

export interface Question {
  id: number;
  type: string;
  field_code: FieldCode | null;
  required: boolean;
}

export interface QuestionOption {
  question_id: number;
  code: string;
  label: string;
  field_code: FieldCode | null;
}

/** answers: question id -> stored JSON value */
export type Answers = Record<number, unknown>;

// Weights used for the match % (must add up to 1)
export const WEIGHTS = {
  interests: 0.4, // Q5-Q14
  workStyle: 0.3, // Q15-Q17
  skill: 0.2, // Q3
  study: 0.05, // Q1
  curious: 0.05, // Q20 (AI)
};

// Extra points for the skill-level estimate, per experience type (Q4)
const EXPERIENCE_BONUS: Record<string, number> = {
  internship: 6,
  job: 6,
  freelance: 5,
  online_courses: 5,
  university_project: 3,
  volunteering: 2,
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const num = (v: unknown, fallback = 0) => (typeof v === "number" && !isNaN(v) ? v : fallback);

// ---------------------------------------------------------------------
// Validation: which required questions are missing / invalid?
// ---------------------------------------------------------------------
export function findMissingAnswers(questions: Question[], answers: Answers): number[] {
  const missing: number[] = [];
  for (const q of questions) {
    if (!q.required) continue;
    const v = answers[q.id];
    let ok = v !== undefined && v !== null && v !== "";
    if (ok && q.type === "rating_grid") ok = typeof v === "object" && Object.keys(v as object).length > 0;
    if (ok && q.type === "multi_select") ok = Array.isArray(v);
    if (ok && q.type === "ranking") ok = Array.isArray(v) && (v as unknown[]).length > 0;
    if (ok && q.type === "most_least") {
      const m = v as { most?: unknown[]; least?: unknown[] };
      ok = Array.isArray(m.most) && Array.isArray(m.least) && m.most.length > 0 && m.least.length > 0;
    }
    if (ok && q.type === "scale") ok = typeof v === "number";
    if (!ok) missing.push(q.id);
  }
  return missing;
}

// ---------------------------------------------------------------------
// Part scores, each between 0 and 1, for every field
// ---------------------------------------------------------------------

/** Interests (Q5-Q14): average of the 2 scale questions that belong to the field. 1..5 -> 0..1 */
export function interestScores(questions: Question[], answers: Answers): Record<FieldCode, number> {
  const out = {} as Record<FieldCode, number>;
  for (const f of FIELD_CODES) {
    const qs = questions.filter((q) => q.type === "scale" && q.field_code === f);
    const vals = qs.map((q) => clamp(num(answers[q.id], 3), 1, 5));
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 3;
    out[f] = (avg - 1) / 4;
  }
  return out;
}

/** Work style (Q15-Q17): Most = +1, Least = -1 for the field of the statement. Range -3..+3 -> 0..1 */
export function workStyleRaw(
  questions: Question[],
  options: QuestionOption[],
  answers: Answers,
): Record<FieldCode, number> {
  const raw = Object.fromEntries(FIELD_CODES.map((f) => [f, 0])) as Record<FieldCode, number>;
  for (const q of questions.filter((q) => q.type === "most_least")) {
    const a = (answers[q.id] ?? {}) as { most?: string[]; least?: string[] };
    const fieldOf = (code: string) =>
      options.find((o) => o.question_id === q.id && o.code === code)?.field_code ?? null;
    for (const c of a.most ?? []) {
      const f = fieldOf(c);
      if (f) raw[f] += 1;
    }
    for (const c of a.least ?? []) {
      const f = fieldOf(c);
      if (f) raw[f] -= 1;
    }
  }
  return raw;
}

export function workStyleScores(raw: Record<FieldCode, number>, mostLeastCount: number) {
  const n = Math.max(1, mostLeastCount);
  const out = {} as Record<FieldCode, number>;
  for (const f of FIELD_CODES) out[f] = (clamp(raw[f], -n, n) + n) / (2 * n);
  return out;
}

/** Skill (Q3): the general skill that belongs to the field. 1..5 -> 0..1 */
export function skillScores(fields: CareerField[], answers: Answers): Record<FieldCode, number> {
  const grid = (answers[3] ?? {}) as Record<string, number>;
  const out = {} as Record<FieldCode, number>;
  for (const f of fields) out[f.code] = (clamp(num(grid[f.q3_skill], 3), 1, 5) - 1) / 4;
  return out;
}

/** Field of study (Q1): which field does the chosen study option point to? */
export function studyField(options: QuestionOption[], answers: Answers): FieldCode | null {
  const code = answers[1];
  return options.find((o) => o.question_id === 1 && o.code === code)?.field_code ?? null;
}

// ---------------------------------------------------------------------
// Final match % for every field
// ---------------------------------------------------------------------
export function computeScores(params: {
  questions: Question[];
  options: QuestionOption[];
  fields: CareerField[];
  answers: Answers;
  curiousField: FieldCode | null; // from AI (Q20), null if skipped
}): Record<FieldCode, number> {
  const { questions, options, fields, answers, curiousField } = params;
  const interests = interestScores(questions, answers);
  const mlCount = questions.filter((q) => q.type === "most_least").length;
  const style = workStyleScores(workStyleRaw(questions, options, answers), mlCount);
  const skills = skillScores(fields, answers);
  const study = studyField(options, answers);

  const scores = {} as Record<FieldCode, number>;
  for (const f of FIELD_CODES) {
    const total =
      WEIGHTS.interests * interests[f] +
      WEIGHTS.workStyle * style[f] +
      WEIGHTS.skill * skills[f] +
      WEIGHTS.study * (study === f ? 1 : 0) +
      WEIGHTS.curious * (curiousField === f ? 1 : 0);
    scores[f] = Math.round(clamp(total, 0, 1) * 100);
  }
  return scores;
}

/** Fields sorted from best to worst match (ties keep the default field order). */
export function rankFields(scores: Record<FieldCode, number>): FieldCode[] {
  return [...FIELD_CODES].sort((a, b) => scores[b] - scores[a]);
}

// ---------------------------------------------------------------------
// Skill gap: estimate the user's current level (0-100) for each key skill
// current = Q3 rating x 14  (+10 if the study field matches) (+ experience, max 15)
// ---------------------------------------------------------------------
export interface SkillGap {
  skill: string;
  current: number;
  target: number;
}

export function estimateSkillGaps(
  fieldCode: FieldCode,
  fieldSkills: FieldSkill[],
  options: QuestionOption[],
  answers: Answers,
): SkillGap[] {
  const grid = (answers[3] ?? {}) as Record<string, number>;
  const experience = Array.isArray(answers[4]) ? (answers[4] as string[]) : [];
  const expBonus = Math.min(15, experience.reduce((s, e) => s + (EXPERIENCE_BONUS[e] ?? 0), 0));
  const studyBonus = studyField(options, answers) === fieldCode ? 10 : 0;

  return fieldSkills
    .filter((s) => s.field_code === fieldCode)
    .map((s) => {
      const rating = clamp(num(grid[s.base_skill], 3), 1, 5);
      const current = clamp(Math.round(rating * 14 + studyBonus + expBonus), 5, 95);
      return { skill: s.name, current, target: s.target };
    });
}

// ---------------------------------------------------------------------
// Fallback text (used if the AI is not configured or fails)
// ---------------------------------------------------------------------
export interface RoadmapStep {
  months: number;
  step: string;
}

export function fallbackRoadmap(gaps: SkillGap[], answers: Answers): RoadmapStep[] {
  const sorted = [...gaps].sort((a, b) => (b.target - b.current) - (a.target - a.current));
  const top = sorted[0]?.skill ?? "your key skills";
  const second = sorted[1]?.skill ?? "a second skill";
  const experience = Array.isArray(answers[4]) ? (answers[4] as string[]) : [];
  const hasWorkExp = experience.includes("internship") || experience.includes("job");
  return [
    { months: 6, step: `Learn the basics of ${top} and ${second} with an online course` },
    { months: 9, step: "Complete 2 practical projects that use these skills" },
    {
      months: 12,
      step: hasWorkExp
        ? "Build a portfolio of your projects and start applying for jobs"
        : "Build a portfolio, apply for an internship, then for entry-level jobs",
    },
  ];
}

/** Turn the user's answers into readable text for the AI prompt. */
export function describeAnswers(
  questions: (Question & { title: string })[],
  options: QuestionOption[],
  answers: Answers,
): string {
  const label = (qid: number, code: unknown) =>
    options.find((o) => o.question_id === qid && o.code === code)?.label ?? String(code);
  const lines: string[] = [];
  for (const q of questions) {
    const v = answers[q.id];
    if (v === undefined || v === null || v === "") continue;
    let text: string;
    switch (q.type) {
      case "dropdown":
      case "single_choice":
        text = label(q.id, v);
        break;
      case "multi_select":
      case "ranking":
        text = (v as string[]).map((c, i) => (q.type === "ranking" ? `${i + 1}. ` : "") + label(q.id, c)).join(", ");
        break;
      case "rating_grid":
        text = Object.entries(v as Record<string, number>).map(([k, n]) => `${label(q.id, k)}: ${n}/5`).join(", ");
        break;
      case "most_least": {
        const m = v as { most?: string[]; least?: string[] };
        text = `MOST: ${(m.most ?? []).map((c) => label(q.id, c)).join(", ")} | LEAST: ${(m.least ?? []).map((c) => label(q.id, c)).join(", ")}`;
        break;
      }
      case "scale":
        text = `${v}/5`;
        break;
      default:
        text = String(v);
    }
    lines.push(`Q${q.id}. ${q.title} -> ${text}`);
  }
  return lines.join("\n");
}
