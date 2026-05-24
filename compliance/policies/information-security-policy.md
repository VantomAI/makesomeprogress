# Information Security Policy

Effective date: May 24, 2026

## Purpose

This policy defines the security practices used to protect Make Some Progress, including the optional Plaid bank transaction import and Supabase-backed account features.

## Scope

This policy applies to the application code, GitHub repository, Supabase project, Plaid integration, user account data, staged bank transaction data, and any system used by the application owner to administer the service.

## Policy

Make Some Progress is operated as a small single-owner application. Security controls are designed to limit access, protect consumer financial data, and avoid destructive automation.

The application must:

- Use Supabase authentication for account-scoped cloud features.
- Use Plaid only through server-side Supabase Edge Functions.
- Store Plaid access tokens only server-side and encrypted.
- Avoid storing Plaid secrets, bank tokens, or production credentials in browser storage or source control.
- Use row-level access controls so users can access only their own data.
- Treat bank imports as read-only and staged until the user approves additions to check logs.
- Keep security-sensitive configuration in Supabase Edge Function secrets or equivalent managed secret storage.

## Responsibilities

The application owner is responsible for maintaining security controls, reviewing access, responding to vulnerabilities, and updating these policies when the architecture changes.

## Review

This policy is reviewed at least annually and after any material change to authentication, Plaid, Supabase, hosting, or sensitive data handling.
