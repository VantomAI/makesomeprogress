import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  return { user: data.user, serviceClient };
}

function bytesFromBase64(value: string) {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}

async function getAesKey() {
  const secret = Deno.env.get('BANK_TOKEN_ENCRYPTION_KEY');
  if (!secret) throw new Error('BANK_TOKEN_ENCRYPTION_KEY is not configured.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['decrypt']);
}

async function decryptToken(ciphertext: string, iv: string) {
  const key = await getAesKey();
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytesFromBase64(iv) }, key, bytesFromBase64(ciphertext));
  return new TextDecoder().decode(decrypted);
}

async function getActiveConnection(serviceClient: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await serviceClient
    .from('bank_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'plaid')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user, serviceClient } = await getAuthedClients(req);
    const connection = await getActiveConnection(serviceClient, user.id);
    if (!connection) return jsonResponse({ success: true });

    if (connection.access_token_ciphertext && connection.encryption_iv) {
      const accessToken = await decryptToken(connection.access_token_ciphertext, connection.encryption_iv);
      await plaidRequest('/item/remove', { access_token: accessToken });
    }

    const { error } = await serviceClient
      .from('bank_connections')
      .update({
        status: 'unlinked',
        access_token_ciphertext: null,
        encryption_iv: null,
        cursor: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)
      .eq('user_id', user.id);
    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Could not unlink Plaid bank connection.' }, 400);
  }
});
