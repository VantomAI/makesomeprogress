# Consumer Consent Tracking Policy

Effective date: May 24, 2026

## Purpose

This policy defines how Make Some Progress obtains and tracks user consent for Plaid bank account connections.

## Scope

This policy applies to any user who connects a financial account through Plaid Link.

## Policy

Make Some Progress obtains consumer consent through Plaid Link before accessing bank transaction data. The application uses Plaid for read-only transaction import and does not initiate payments or money movement.

The application must:

- Present Plaid Link only after the user signs in.
- Use Plaid's hosted consent flow for institution login and authorization.
- Store connection metadata tied to the authenticated Supabase user.
- Allow the user to unlink the bank connection.
- Treat imported transactions as staged review data until the user approves additions to check logs.
- Avoid accessing or storing banking credentials directly.

## Consent Records

Consent is represented by Plaid connection metadata, including institution information, Plaid item identifier, connection status, creation date, and authenticated application user ID.

## Withdrawal

Users may withdraw access by using the application's Unlink control. Unlinking removes the active Plaid connection token server-side and prevents future syncs.
