// =====================================================================
// PathFinder AI - Edge Function: analyze-profile
//
// Called by the frontend when the user clicks "See results".
//   1. reads the user's 20 answers
//   2. (AI) understands the Q20 sentence -> which field it points to
//   3. calculates the 5 field scores
//   4. estimates skill gaps for the top 3 fields
//   5. (AI) writes a personal explanation + 6/9/12-month roadmap
//   6. saves everything in `results` + `result_details` and returns it
//
// If the AI key is missing or the AI fails, the function still works
// and uses fallback text (results.ai_used = false).
//
// Secrets (Dashboard -> Edge Functions -> Secrets):
//   GEMINI_API_KEY   (required for AI)  - from https://aistudio.google.com/apikey
//   GEMINI_MODEL     (optional)         - default "gemini-flash-latest"
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  type Answers,
  type CareerField,
  computeScores,
  describeAnswers,
  estimateSkillGaps,
  fallbackRoadmap,
  FIELD_CODES,
  type FieldCode,
  type FieldSkill,
  findMissingAnswers,
  type Question,
  type QuestionOption,
  rankFields,
  type RoadmapStep,
  type SkillGap,
} from "./scoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------
// Gemini helper: send a prompt, get JSON back. Returns null on any failure.
// ---------------------------------------------------------------------
async function askGemini(system: string, prompt: string): Promise<any | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return null;
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
    if (!res.ok) {
      console.error("Gemini error", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((p: any) => !p.thought && typeof p.text === "string").map((p: any) => p.text).join("");
    const cleaned = text.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Gemini call failed", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// AI step 1: which field does the Q20 sentence point to?
async function classifyCurious(text: string, fields: CareerField[]): Promise<FieldCode | null> {
  const list = fields.map((f) => `- ${f.code}: ${f.name}`).join("\n");
  const out = await askGemini(
    "You classify a student's sentence about a job or field they are curious about into one career field. Answer only with JSON.",
    `Career fields:\n${list}\n\nStudent sentence: "${text}"\n\n` +
      `Return JSON: {"field": "<one code from the list, or none>"}`,
  );
  const f = out?.field;
  return FIELD_CODES.includes(f) ? f : null;
}

// AI step 2: personal explanation + roadmap for the top 3 fields
interface Personalized {
  explanation: string;
  roadmap: RoadmapStep[];
}

async function personalize(
  answersText: string,
  top: { field: CareerField; score: number; gaps: SkillGap[]; careers: string[] }[],
): Promise<Record<string, Personalized> | null> {
  const fieldsText = top.map((t, i) =>
    `${i + 1}. ${t.field.code} (${t.field.name}) - match ${t.score}%\n` +
    `   careers: ${t.careers.join(", ")}\n` +
    `   skill gaps: ${t.gaps.map((g) => `${g.skill} ${g.current}% -> ${g.target}%`).join("; ")}`
  ).join("\n");

  const out = await askGemini(
    "You are a friendly career advisor for university students and graduates. " +
      "Write in simple, clear English. Be specific and practical. Answer only with JSON.",
    `Here are the student's questionnaire answers:\n${answersText}\n\n` +
      `Their top 3 career fields:\n${fieldsText}\n\n` +
      `For EACH field write:\n` +
      `- "explanation": ONE short sentence (max 20 words) that tells the student why this field fits them, based on their answers. Start with "You".\n` +
      `- "roadmap": exactly 3 steps for 6, 9 and 12 months. Each step max 12 words. ` +
      `Focus on the biggest skill gaps. Adapt to their stage (Q2), experience (Q4) and weekly learning time (Q19): ` +
      `less time = smaller steps. If they have no internship or job, include getting one.\n\n` +
      `Return JSON exactly like this:\n` +
      `{"fields": [{"code": "data", "explanation": "...", "roadmap": [{"months": 6, "step": "..."}, {"months": 9, "step": "..."}, {"months": 12, "step": "..."}]}]}`,
  );

  if (!Array.isArray(out?.fields)) return null;
  const result: Record<string, Personalized> = {};
  for (const f of out.fields) {
    const okRoadmap = Array.isArray(f?.roadmap) && f.roadmap.length === 3 &&
      f.roadmap.every((s: any) => typeof s?.step === "string" && s.step.trim());
    if (typeof f?.code === "string" && typeof f?.explanation === "string" && f.explanation.trim() && okRoadmap) {
      result[f.code] = {
        explanation: f.explanation.trim(),
        roadmap: [6, 9, 12].map((m, i) => ({ months: m, step: String(f.roadmap[i].step).trim() })),
      };
    }
  }
  return result;
}

// ---------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. Who is calling? (the frontend sends the user's login token automatically)
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await db.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "Not logged in" }, 401);
    const userId = userData.user.id;

    // 2. Load everything we need
    const [qRes, oRes, fRes, sRes, cRes, aRes] = await Promise.all([
      db.from("questions").select("id, type, field_code, required, title").order("id"),
      db.from("question_options").select("question_id, code, label, field_code"),
      db.from("career_fields").select("code, name, short_label, description, q3_skill").order("sort_order"),
      db.from("field_skills").select("field_code, name, base_skill, target").order("sort_order"),
      db.from("careers").select("field_code, title").order("sort_order"),
      db.from("answers").select("question_id, value").eq("user_id", userId),
    ]);
    const loadError = [qRes, oRes, fRes, sRes, cRes, aRes].find((r) => r.error)?.error;
    if (loadError) throw loadError;

    const questions = qRes.data as (Question & { title: string })[];
    const options = oRes.data as QuestionOption[];
    const fields = fRes.data as CareerField[];
    const fieldSkills = sRes.data as FieldSkill[];
    const careers = cRes.data as { field_code: string; title: string }[];
    const answers: Answers = {};
    for (const a of aRes.data ?? []) answers[a.question_id] = a.value;

    // 3. All required questions answered?
    const missing = findMissingAnswers(questions, answers);
    if (missing.length) {
      return json({ error: "Please answer all required questions", missing_questions: missing }, 400);
    }

    // 4. AI: understand the optional Q20 sentence
    const curiousText = typeof answers[20] === "string" ? (answers[20] as string).trim() : "";
    const curiousField = curiousText ? await classifyCurious(curiousText, fields) : null;

    // 5. Scores for the 5 fields + top 3
    const scores = computeScores({ questions, options, fields, answers, curiousField });
    const topCodes = rankFields(scores).slice(0, 3);

    // 6. Skill gaps for the top 3
    const top = topCodes.map((code) => ({
      field: fields.find((f) => f.code === code)!,
      score: scores[code],
      gaps: estimateSkillGaps(code, fieldSkills, options, answers),
      careers: careers.filter((c) => c.field_code === code).map((c) => c.title),
    }));

    // 7. AI: personal explanation + roadmap (fallback if AI is not available)
    const ai = await personalize(describeAnswers(questions, options, answers), top);
    const aiUsed = !!ai && topCodes.every((c) => ai[c]);

    // 8. Save
    const { data: result, error: resultError } = await db
      .from("results")
      .insert({ user_id: userId, scores, top_fields: topCodes, ai_used: aiUsed })
      .select("id, share_id, created_at")
      .single();
    if (resultError) throw resultError;

    const details = top.map((t, i) => ({
      result_id: result.id,
      field_code: t.field.code,
      rank: i + 1,
      match_percent: t.score,
      explanation: ai?.[t.field.code]?.explanation ?? t.field.description,
      skill_gaps: t.gaps,
      roadmap: ai?.[t.field.code]?.roadmap ?? fallbackRoadmap(t.gaps, answers),
    }));
    const { error: detailsError } = await db.from("result_details").insert(details);
    if (detailsError) throw detailsError;

    // 9. Return everything the results page needs
    return json({
      result_id: result.id,
      share_id: result.share_id,
      created_at: result.created_at,
      ai_used: aiUsed,
      scores: fields.map((f) => ({ code: f.code, name: f.name, short_label: f.short_label, score: scores[f.code] })),
      top_matches: details.map((d) => ({
        rank: d.rank,
        code: d.field_code,
        name: fields.find((f) => f.code === d.field_code)!.name,
        match_percent: d.match_percent,
        explanation: d.explanation,
        skill_gaps: d.skill_gaps,
        roadmap: d.roadmap,
      })),
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong", details: String((e as Error)?.message ?? e) }, 500);
  }
});
