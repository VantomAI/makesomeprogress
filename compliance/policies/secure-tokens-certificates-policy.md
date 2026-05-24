# Secure Tokens and Certificates Policy

Effective date: May 24, 2026

## Purpose

This policy defines how Make Some Progress protects tokens, API keys, certificates, and other authentication secrets.

## Scope

This policy applies to Plaid credentials, Plaid access tokens, Supabase keys, service-role keys, Edge Function secrets, OAuth tokens, browser session tokens, and TLS certificates.

## Policy

Secrets must be protected using secure storage and least privilege.

Requirements:

- Plaid client secrets and production keys must be stored only in Supabase Edge Function secrets or equivalent secret storage.
- Plaid access tokens must be encrypted before database storage.
- Supabase service-role keys must never be exposed in browser code.
- Bank credentials, MFA codes, and security answers must never be collected or stored by the application.
- Secrets must not be committed to GitHub.
- Public browser keys must be limited to their intended public use and protected by database policies.
- HTTPS/TLS must be used for hosted application and API traffic.

## Rotation

Secrets must be rotated if compromise is suspected, when access is no longer required, or after accidental exposure.

## Review

Secret storage and token handling are reviewed at least annually and after changes to authentication, Plaid, or Supabase Edge Functions.
