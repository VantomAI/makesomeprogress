import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const ALLOWED_BANK_EMAIL = 'nexu@mail.com';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function plaidBaseUrl() {
  const env = (Deno.env.get('PLAID_ENV') || 'sandbox').toLowerCase();
  if (env === 'production') return 'https://production.plaid.com';
  if (env === 'development') return 'https://development.plaid.com';
  return 'https://sandbox.plaid.com';
}

async function plaidRequest(path: string, body: Record<string, unknown>) {
  const clientId = Deno.env.get('PLAID_CLIENT_ID');
  const secret = Deno.env.get('PLAID_SECRET');
  if (!clientId || !secret) throw new Error('Plaid secrets are not configured.');
  const res = await fetch(`${plaidBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, secret, ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error_message || data?.display_message || `Plaid request failed: ${path}`);
  return data;
}

async function getUser(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) throw new Error('Supabase function secrets are not configured.');
  const authHeader = req.headers.get('Authorization') || '';
  const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) throw new Error('Not authenticated.');
  if ((data.user.email || '').trim().toLowerCase() !== ALLOWED_BANK_EMAIL) {
    throw new Error(`Plaid bank linking is restricted to ${ALLOWED_BANK_EMAIL}.`);
  }
  return data.user;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    const data = await plaidRequest('/link/token/create', {
      client_name: 'Make Some Progress',
      country_codes: ['US'],
      language: 'en',
      products: ['transactions'],
      transactions: { days_requested: 730 },
      user: { client_user_id: user.id },
    });
    return jsonResponse({ link_token: data.link_token, expiration: data.expiration });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Could not create Plaid link token.' }, 400);
  }
});
