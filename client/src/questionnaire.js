import { supabase } from './supabase.js';

// Load sections, the 20 questions (with options) and the user's saved answers.
export async function loadQuestionnaire(userId) {
  const [sRes, qRes, aRes] = await Promise.all([
    supabase.from('sections').select('id, title, description, sort_order').order('sort_order'),
    supabase.from('questions').select('*, question_options(code, label, sort_order)').order('id'),
    supabase.from('answers').select('question_id, value').eq('user_id', userId),
  ]);
  const error = sRes.error || qRes.error || aRes.error;
  if (error) throw error;

  const questions = qRes.data.map((q) => ({
    ...q,
    options: [...(q.question_options || [])].sort((a, b) => a.sort_order - b.sort_order),
  }));
  const answers = Object.fromEntries((aRes.data || []).map((a) => [a.question_id, a.value]));
  return { sections: sRes.data, questions, answers };
}

// Save (or overwrite) one answer.
export async function saveAnswer(userId, questionId, value) {
  const { error } = await supabase
    .from('answers')
    .upsert(
      { user_id: userId, question_id: questionId, value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,question_id' },
    );
  if (error) throw error;
}

// Empty value for each question type.
export function emptyValue(q) {
  switch (q.type) {
    case 'rating_grid': return {};
    case 'multi_select': return [];
    case 'ranking': return [];
    case 'most_least': return { most: [], least: [] };
    case 'text': return '';
    default: return null;
  }
}

// Is the answer complete enough to go to the next question?
export function isComplete(q, v) {
  if (!q.required) return true;
  switch (q.type) {
    case 'dropdown':
    case 'single_choice': return !!v;
    case 'scale': return typeof v === 'number';
    case 'rating_grid': return !!v && q.options.every((o) => typeof v[o.code] === 'number');
    case 'multi_select': return Array.isArray(v);
    case 'ranking': return Array.isArray(v) && v.length === (q.settings?.count || 3);
    case 'most_least': return !!v && v.most?.length > 0 && v.least?.length > 0;
    default: return v !== null && v !== undefined && v !== '';
  }
}

// Is this saved answer already filled in? (used for the section check marks)
export function isAnswered(q, v) {
  if (v === undefined) return false;
  if (!q.required) return true;
  return isComplete(q, v);
}
