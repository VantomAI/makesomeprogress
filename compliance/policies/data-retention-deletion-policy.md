# Data Retention and Deletion Policy

Effective date: May 24, 2026

## Purpose

This policy defines how Make Some Progress retains and deletes user data.

## Scope

This policy applies to local budget data, Supabase account data, Plaid connection metadata, staged bank transactions, check logs, recurring expenses, dashboard tiles, and AI activity logs.

## Policy

Make Some Progress retains data only as needed to provide budgeting, check-log, dashboard, and optional bank import features.

Data categories:

- Local app data: Stored in the user's browser localStorage until the user clears or resets it.
- Supabase budget data: Stored for signed-in sync until deleted by the user or administrator upon request.
- Plaid connection tokens: Stored encrypted server-side while the bank connection is active.
- Bank transactions: Stored as staged review data for budgeting and reconciliation.
- AI settings and chat history: Stored locally unless otherwise configured.

## Deletion

Users may delete local data through app reset/import controls and may unlink bank accounts through the Bank Transactions settings.

When a bank account is unlinked, Make Some Progress removes the active Plaid access token server-side and prevents future syncs. Historical budget items already added to check logs are retained unless the user deletes them.

## Review

Retention practices are reviewed annually and whenever data storage changes materially.
