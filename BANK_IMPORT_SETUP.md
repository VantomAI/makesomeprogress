# Bank Import Setup

This app uses Plaid through Supabase Edge Functions. The browser app never stores Plaid access tokens. Tokens are exchanged inside Supabase and encrypted before they are saved.

## Plaid

1. Create a Plaid account and enable the Transactions product.
2. Copy your Plaid `client_id` and Production `secret`.
3. Confirm SoFi availability during Plaid Link. Plaid institution coverage can change, so Link is the final compatibility check.

## Supabase

1. Apply `supabase/migrations/20260524_bank_imports.sql`.
2. Set Edge Function secrets:

```bash
supabase secrets set PLAID_CLIENT_ID=your_client_id
supabase secrets set PLAID_SECRET=your_production_secret
supabase secrets set PLAID_ENV=production
supabase secrets set BANK_TOKEN_ENCRYPTION_KEY=use_a_long_random_secret
```

For Sandbox testing, use your Sandbox secret and set `PLAID_ENV=sandbox`.

3. Deploy the functions:

```bash
supabase functions deploy plaid-create-link-token
supabase functions deploy plaid-exchange-public-token
supabase functions deploy plaid-sync-transactions
supabase functions deploy plaid-unlink-bank
```

If you are using the Supabase Dashboard editor instead of the CLI, delete and re-create each function with the exact names below, then paste the matching `index.ts` file exactly as-is:

| Function name | File to paste |
| --- | --- |
| `plaid-create-link-token` | `supabase/functions/plaid-create-link-token/index.ts` |
| `plaid-exchange-public-token` | `supabase/functions/plaid-exchange-public-token/index.ts` |
| `plaid-sync-transactions` | `supabase/functions/plaid-sync-transactions/index.ts` |
| `plaid-unlink-bank` | `supabase/functions/plaid-unlink-bank/index.ts` |

The Dashboard-ready function files are self-contained and do not require the `_shared` helper file. Each function also restricts Plaid access to `nexu@mail.com`.

## Test Flow

1. Sign into Make Some Progress.
2. Create a check log starting `2026-05-20`.
3. Open Settings and connect a bank. Only `nexu@mail.com` can link or sync Plaid.
4. Click `Sync Since 5/20`.
5. Review the staged transactions on the check log.
6. Click `Add Suggested` to add new matched expenses.

The import is additive only. It does not delete check logs, remove expenses, overwrite manual history, or change check amounts.

## Common Error

If the app says `Bank sync backend is not deployed yet` or `Failed to send a request to the Edge Function`, the browser reached Supabase but the function endpoint is missing. Deploy the four Plaid functions above, then refresh the app and try connecting again.

If Supabase says it cannot find `../_shared/bank.ts`, you pasted an older shared-helper version of the function. Use the current self-contained `index.ts` files in `supabase/functions/*/index.ts`.
