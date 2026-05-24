import {
  corsHeaders,
  decryptToken,
  getActiveConnection,
  getAuthedClients,
  jsonResponse,
  normalizePlaidTransaction,
  plaidRequest,
} from '../_shared/bank.ts';

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
