import { supabase } from './supabase.js';

const RESULT_COLUMNS =
  'id, user_id, scores, top_fields, is_saved, share_id, ai_used, created_at, ' +
  'result_details(field_code, rank, match_percent, explanation, skill_gaps, roadmap)';

// Run the analysis (the "See results" button). Returns the new result.
export async function analyzeProfile() {
  const { data, error } = await supabase.functions.invoke('analyze-profile', { method: 'POST', body: {} });
  if (error) {
    let details = null;
    try {
      details = await error.context.json(); // the function's own error message
    } catch {
      /* not JSON */
    }
    const err = new Error(details?.error || error.message || 'Analysis failed');
    err.missingQuestions = details?.missing_questions || null;
    throw err;
  }
  return data;
}

// The 5 career fields with their careers and work environments.
export async function loadFields() {
  const { data, error } = await supabase
    .from('career_fields')
    .select('code, name, short_label, description, sort_order, careers(title, sort_order), work_environments(name, sort_order)')
    .order('sort_order');
  if (error) throw error;
  return data.map((f) => ({
    ...f,
    careers: [...(f.careers || [])].sort((a, b) => a.sort_order - b.sort_order),
    work_environments: [...(f.work_environments || [])].sort((a, b) => a.sort_order - b.sort_order),
  }));
}

function normalize(result) {
  if (!result) return null;
  return { ...result, result_details: [...(result.result_details || [])].sort((a, b) => a.rank - b.rank) };
}

// One result by id, or the user's latest result when no id is given.
export async function loadResult({ resultId, userId }) {
  let query = supabase.from('results').select(RESULT_COLUMNS);
  query = resultId
    ? query.eq('id', resultId).maybeSingle()
    : query.eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await query;
  if (error) throw error;
  return normalize(data);
}

// A result opened from a Share link.
export async function loadSharedResult(shareId) {
  const { data, error } = await supabase.from('results').select(RESULT_COLUMNS).eq('share_id', shareId).maybeSingle();
  if (error) throw error;
  return normalize(data);
}

// All results of the user ("My results").
export async function loadMyResults(userId) {
  const { data, error } = await supabase
    .from('results')
    .select('id, scores, top_fields, is_saved, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// "Save results" / "Save to my profile"
export async function saveResult(resultId) {
  const { error } = await supabase.from('results').update({ is_saved: true }).eq('id', resultId);
  if (error) throw error;
}

export const shareLink = (shareId) => `${window.location.origin}/share/${shareId}`;
