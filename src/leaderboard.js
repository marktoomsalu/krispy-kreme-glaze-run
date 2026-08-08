import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Public by design: this is Supabase's "anon" key, safe to expose in
// client code. All access control lives in RLS policies + the
// SECURITY DEFINER RPC functions in supabase/schema.sql — see README.md
// for setup. Until these are filled in, the leaderboard silently no-ops.
const SUPABASE_URL = 'https://yvupxbclhuyofjfwfklq.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2dXB4YmNsaHV5b2ZqZndma2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNzIxMzAsImV4cCI6MjEwMTc0ODEzMH0.4gJlOk-mMLY7qyxxJdPCvvbI2rKaeY2Y5axO8e06jBc';

const configured = !SUPABASE_URL.startsWith('YOUR_') && !SUPABASE_ANON_KEY.startsWith('YOUR_');
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const NICK_KEY = 'glaze-runner:nickname';
const PLAYER_KEY = 'glaze-runner:playerId';

// A random id the client mints once and reuses forever, so the leaderboard
// can keep just this player's best run instead of one row per attempt. Not
// an account system — just enough to de-duplicate a returning browser.
function getPlayerId() {
  try {
    let id = localStorage.getItem(PLAYER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(PLAYER_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID(); // localStorage unavailable — still works, just not remembered
  }
}

export async function startRun() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('start_run');
    if (error || !data?.[0]) return null;
    return { runId: data[0].run_id, token: data[0].token };
  } catch {
    return null;
  }
}

export async function submitScore({ runId, token, distance, bonus, dozens, holes, smashes, nickname }) {
  if (!supabase) return { status: 'error' };
  try {
    const { data, error } = await supabase.rpc('submit_score', {
      p_run_id: runId,
      p_token: token,
      p_distance: distance,
      p_bonus: bonus,
      p_dozens: dozens,
      p_holes: holes,
      p_smashes: smashes,
      p_nickname: nickname,
      p_player_id: getPlayerId()
    });
    if (error || !data?.[0]) return { status: 'error' };
    const r = data[0];
    return {
      status: r.accepted ? 'accepted' : 'rejected',
      score: r.score,
      rank: r.rank,
      tier: r.tier,
      claimCode: r.claim_code,
      isNewBest: r.is_new_best,
      reason: r.reason
    };
  } catch {
    return { status: 'error' };
  }
}

export async function submitClaimContact(claimCode, contact) {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc('submit_claim_contact', {
      p_claim_code: claimCode,
      p_contact: contact
    });
    return !error && data === true;
  } catch {
    return false;
  }
}

export async function fetchTop(n = 10) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('nickname,score,tier,created_at')
      .order('score', { ascending: false })
      .limit(n);
    return error ? [] : data;
  } catch {
    return [];
  }
}

export const getNickname = () => {
  try {
    return localStorage.getItem(NICK_KEY) || '';
  } catch {
    return '';
  }
};

export function saveNickname(name) {
  try {
    localStorage.setItem(NICK_KEY, name.slice(0, 20));
  } catch {
    /* ignore */
  }
}
