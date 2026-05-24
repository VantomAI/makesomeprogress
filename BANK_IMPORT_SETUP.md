# Bank Import Setup

This app uses Plaid through Supabase Edge Functions. The browser app never stores Plaid access tokens. Tokens are exchanged inside Supabase and encrypted before they are saved.

## Plaid

1. Create a Plaid account and start in Sandbox.
2. Copy your Plaid `client_id` and Sandbox `secret`.
3. Confirm SoFi availability during Plaid Link. Plaid institution coverage can change, so Link is the final compatibility check.

## Supabase

1. Apply `supabase/migrations/20260524_bank_imports.sql`.
2. Set Edge Function secrets:

```bash
supabase secrets set PLAID_CLIENT_ID=your_client_id
supabase secrets set PLAID_SECRET=your_sandbox_secret
supabase secrets set PLAID_ENV=sandbox
supabase secrets set BANK_TOKEN_ENCRYPTION_KEY=use_a_long_random_secret
```

3. Deploy the functions:

```bash
supabase functions deploy plaid-create-link-token
supabase functions deploy plaid-exchange-public-token
supabase functions deploy plaid-sync-transactions
supabase functions deploy plaid-unlink-bank
```

## Test Flow

1. Sign into Make Some Progress.
2. Create a check log starting `2026-05-20`.
3. Open Settings, connect a bank, and use Plaid Sandbox first.
4. Click `Sync Since 5/20`.
5. Review the staged transactions on the check log.
6. Click `Add Suggested` to add new matched expenses.

The import is additive only. It does not delete check logs, remove expenses, overwrite manual history, or change check amounts.

## Common Error

If the app says `Bank sync backend is not deployed yet` or `Failed to send a request to the Edge Function`, the browser reached Supabase but the function endpoint is missing. Deploy the four Plaid functions above, then refresh the app and try connecting again.
