# Role-Based Access Control Policy

Effective date: May 24, 2026

## Purpose

This policy defines role-based access control for Make Some Progress.

## Scope

This policy applies to Supabase, Plaid, GitHub, and any administrative systems used to operate the application.

## Roles

Make Some Progress currently uses a minimal role model:

- User: Can sign in, manage their own budgeting data, connect or unlink their own Plaid account, sync their own transactions, and approve staged transaction additions.
- Owner/Administrator: Can manage application code, Supabase configuration, Plaid configuration, database schema, Edge Functions, and production deployment.
- Service role: Used only by Supabase Edge Functions for controlled server-side operations that cannot be performed safely from the browser.

## Policy

Access must be granted using least privilege. Users must not be able to access another user's budget data, bank transactions, Plaid connection metadata, or staged imports.

Administrative access must be limited to the owner or explicitly approved maintainers. Service-role keys must not be exposed to the browser, checked into source control, or shared through insecure channels.

## Review

Roles and permissions are reviewed at least quarterly and whenever a new administrator, contributor, or integration is added.
