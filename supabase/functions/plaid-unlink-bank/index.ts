import { corsHeaders, decryptToken, getActiveConnection, getAuthedClients, jsonResponse, plaidRequest } from '../_shared/bank.ts';

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
