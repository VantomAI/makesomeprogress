import { corsHeaders, getAuthedClients, jsonResponse, plaidRequest } from '../_shared/bank.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user } = await getAuthedClients(req);
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
