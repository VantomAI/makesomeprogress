# End-of-Life Software Management Policy

Effective date: May 24, 2026

## Purpose

This policy defines how Make Some Progress monitors and manages end-of-life software and dependencies.

## Scope

This policy applies to browser libraries, Supabase Edge Function runtime dependencies, GitHub Pages deployment, third-party scripts, and development tooling.

## Policy

The owner monitors software and dependencies for end-of-life notices, unsupported versions, and major security updates.

The application should avoid relying on unsupported libraries or runtimes for security-sensitive functionality.

Examples include:

- Supabase JavaScript client.
- Plaid Link script.
- Chart.js.
- Supabase Edge Function runtime.
- Any package imported by Edge Functions.

## Remediation

End-of-life or unsupported components must be upgraded, replaced, or removed within a reasonable timeframe based on risk. Security-sensitive or internet-facing components should be prioritized.

## Review

Dependency status is reviewed at least semiannually and whenever security notices are received.
