# Access Control Policy

Effective date: May 24, 2026

## Purpose

This policy defines access control requirements for Make Some Progress.

## Scope

This policy applies to application users, administrative users, Supabase data, Plaid connection data, Edge Functions, and source code.

## Policy

Access to data and systems must be authenticated, authorized, and limited to the minimum level required.

Controls include:

- Supabase Auth for user sign-in.
- Supabase Row Level Security for user-owned data.
- Server-side Edge Functions for Plaid token exchange and transaction sync.
- Service-role access restricted to server-side code only.
- Secrets stored in Supabase Edge Function secrets or equivalent secret storage.
- No Plaid access tokens, service-role keys, or banking secrets stored in browser localStorage or GitHub.

## User Access

Users may access only their own budget data, bank connection metadata, staged bank transactions, and check logs.

## Administrative Access

Administrative access is restricted to the owner or explicitly approved maintainers and must be protected by strong authentication and MFA where supported.
