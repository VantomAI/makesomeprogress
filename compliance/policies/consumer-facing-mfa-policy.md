# Consumer-Facing MFA Policy

Effective date: May 24, 2026

## Purpose

This policy defines multi-factor authentication expectations for the consumer-facing portions of Make Some Progress where Plaid Link is deployed.

## Scope

This policy applies to users who sign into Make Some Progress and connect bank accounts through Plaid Link.

## Policy

Make Some Progress uses Supabase Auth for application sign-in and Plaid Link for financial institution authorization. The application does not collect or store bank credentials.

When a user connects a bank account, MFA or step-up authentication required by the financial institution is handled through Plaid Link and the institution's own authentication flow.

The application should support MFA for user accounts where available through Supabase Auth. If consumer MFA is not yet enabled in the application, the owner will evaluate and enable it before expanding bank connectivity beyond limited testing.

## Requirements

- Plaid Link must be launched only for authenticated users.
- Bank authentication must occur through Plaid and the institution, not through custom application forms.
- The application must not store bank passwords, MFA codes, or security questions.

## Review

Consumer authentication settings are reviewed at least annually and before production expansion.
