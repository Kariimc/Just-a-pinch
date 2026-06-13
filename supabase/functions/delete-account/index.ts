// delete-account: permanently deletes the signed-in user's account.
//
// The client cannot delete its own auth.users row, so this runs the privileged
// delete with the service-role key. Every app table references
// auth.users(id) ON DELETE CASCADE (profiles, recipes, meal_plan,
// shopping_items, community_recipes, community_ratings), so removing the auth
// user wipes all of their data in one step.
//
// The caller is identified from their JWT — a client-supplied id is never
// trusted — so a user can only ever delete their own account.
//
// Deploy:  supabase functions deploy delete-account
// Set verify_jwt = true so only authenticated callers reach it.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Not authenticated' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!serviceKey) {
      return json({ error: 'Account deletion is not configured (missing service role key).' }, 500);
    }

    // Resolve the caller from their own token.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Not authenticated' }, 401);

    // Privileged cascade delete.
    const admin = createClient(supabaseUrl, serviceKey);
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
