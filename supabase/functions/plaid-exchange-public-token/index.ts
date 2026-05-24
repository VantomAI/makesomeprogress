import { corsHeaders, encryptToken, getAuthedClients, jsonResponse, plaidRequest } from '../_shared/bank.ts';

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
