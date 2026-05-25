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
    throw new Error(`Plaid bank sync is restricted to ${ALLOWED_BANK_EMAIL}.`);
  }
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

function normalizePlaidTransaction(tx: Record<string, any>, userId: string, connectionId: string) {
  const category = tx.personal_finance_category?.primary || (Array.isArray(tx.category) ? tx.category[0] : tx.category) || 'Other';
  return {
    user_id: userId,
    connection_id: connectionId,
    provider: 'plaid',
    provider_transaction_id: tx.transaction_id,
    account_id: tx.account_id,
    date: tx.date,
    posted_date: tx.authorized_date || tx.date,
    merchant_name: tx.merchant_name || tx.name || 'Unknown merchant',
    raw_description: tx.name || tx.original_description || tx.merchant_name || '',
    amount: Math.abs(Number(tx.amount) || 0),
    category,
    pending: !!tx.pending,
    metadata: tx,
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user, serviceClient } = await getAuthedClients(req);
    const body = await req.json().catch(() => ({}));
    const startDate = body.startDate || '2026-05-20';
    const connection = await getActiveConnection(serviceClient, user.id);
    if (!connection) throw new Error('No active Plaid bank connection found.');
    if (!connection.access_token_ciphertext || !connection.encryption_iv) throw new Error('Bank connection is missing its encrypted token.');

    const accessToken = await decryptToken(connection.access_token_ciphertext, connection.encryption_iv);
    let cursor = connection.cursor || undefined;
    let hasMore = true;
    const added: Record<string, any>[] = [];
    const modified: Record<string, any>[] = [];
    const removed: Record<string, any>[] = [];

    while (hasMore) {
      const batch = await plaidRequest('/transactions/sync', {
        access_token: accessToken,
        cursor,
        count: 500,
      });
      added.push(...(batch.added || []));
      modified.push(...(batch.modified || []));
      removed.push(...(batch.removed || []));
      cursor = batch.next_cursor;
      hasMore = !!batch.has_more;
    }

    const normalized = [...added, ...modified]
      .filter(tx => tx.date >= startDate && Number(tx.amount) > 0)
      .map(tx => normalizePlaidTransaction(tx, user.id, connection.id));

    if (normalized.length) {
      const { error } = await serviceClient
        .from('bank_transactions')
        .upsert(normalized, { onConflict: 'user_id,provider,provider_transaction_id' });
      if (error) throw error;
    }

    if (removed.length) {
      const removedIds = removed.map(tx => tx.transaction_id).filter(Boolean);
      if (removedIds.length) {
        await serviceClient
          .from('bank_transactions')
          .update({ ignored: true, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('provider', 'plaid')
          .in('provider_transaction_id', removedIds);
      }
    }

    const { error: cursorError } = await serviceClient
      .from('bank_connections')
      .update({ cursor, updated_at: new Date().toISOString() })
      .eq('id', connection.id)
      .eq('user_id', user.id);
    if (cursorError) throw cursorError;

    const { data: transactions, error: txError } = await serviceClient
      .from('bank_transactions')
      .select('provider, provider_transaction_id, account_id, date, posted_date, merchant_name, raw_description, amount, category, pending, ignored, applied_log_id, applied_item_id')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .order('date', { ascending: false });
    if (txError) throw txError;

    return jsonResponse({
      connected: true,
      connection: {
        id: connection.id,
        institution_name: connection.institution_name,
        status: connection.status,
      },
      transactions: (transactions || []).map(tx => ({
        provider: tx.provider,
        providerTransactionId: tx.provider_transaction_id,
        accountId: tx.account_id,
        date: tx.date,
        postedDate: tx.posted_date,
        merchantName: tx.merchant_name,
        rawDescription: tx.raw_description,
        amount: Number(tx.amount) || 0,
        category: tx.category,
        pending: tx.pending,
        ignored: tx.ignored,
        appliedLogId: tx.applied_log_id,
        appliedItemId: tx.applied_item_id,
      })),
    });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Could not sync Plaid transactions.' }, 400);
  }
});
