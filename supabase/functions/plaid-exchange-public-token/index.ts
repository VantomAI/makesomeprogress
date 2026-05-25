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

async function getAuthedClients(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error('Supabase function secrets are not configured.');
  const authHeader = req.headers.get('Authorization') || '';
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) throw new Error('Not authenticated.');
  if ((data.user.email || '').trim().toLowerCase() !== ALLOWED_BANK_EMAIL) {
    throw new Error(`Plaid bank linking is restricted to ${ALLOWED_BANK_EMAIL}.`);
  }
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  return { user: data.user, serviceClient };
}

function base64FromBytes(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

async function getAesKey() {
  const secret = Deno.env.get('BANK_TOKEN_ENCRYPTION_KEY');
  if (!secret) throw new Error('BANK_TOKEN_ENCRYPTION_KEY is not configured.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt']);
}

async function encryptToken(token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getAesKey();
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(token));
  return {
    ciphertext: base64FromBytes(new Uint8Array(encrypted)),
    iv: base64FromBytes(iv),
  };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user, serviceClient } = await getAuthedClients(req);
    const body = await req.json().catch(() => ({}));
    if (!body.public_token) throw new Error('Missing Plaid public token.');

    const exchange = await plaidRequest('/item/public_token/exchange', { public_token: body.public_token });
    const encrypted = await encryptToken(exchange.access_token);
    const institution = body.metadata?.institution || {};

    const { data, error } = await serviceClient
      .from('bank_connections')
      .upsert({
        user_id: user.id,
        provider: 'plaid',
        item_id: exchange.item_id,
        access_token_ciphertext: encrypted.ciphertext,
        encryption_iv: encrypted.iv,
        institution_id: institution.institution_id || null,
        institution_name: institution.name || 'Plaid bank',
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider,item_id' })
      .select('id, provider, item_id, institution_id, institution_name, status, created_at, updated_at')
      .single();
    if (error) throw error;
    return jsonResponse({ connection: data });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Could not exchange Plaid token.' }, 400);
  }
});
