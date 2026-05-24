# Privacy Policy

Effective date: May 24, 2026

## Overview

Make Some Progress is a budgeting application that helps users manage check logs, expenses, dashboard trackers, and optional bank transaction imports.

## Information Collected

The application may process:

- Account sign-in information managed through Supabase.
- Budgeting data entered by the user, such as check logs, expenses, dashboard tiles, and recurring bills.
- Optional bank transaction data imported through Plaid after user consent.
- Local AI chat history and settings if the user enables the AI agent.

## Bank Data

Bank connection is optional. When enabled, Make Some Progress uses Plaid Link for user consent and bank authorization. The application does not collect or store bank credentials.

Plaid access tokens are handled server-side through Supabase Edge Functions and are not stored in the browser. Imported transactions are staged for review before being added to check logs.

## Use of Information

Information is used to provide budgeting features, sync data for signed-in users, import read-only bank transactions, categorize expenses, and display summaries or merchant profiles.

## Sharing

Make Some Progress does not sell user data. Data may be processed by service providers necessary to operate the app, including Supabase for authentication/storage and Plaid for bank connectivity.

## User Control

Users may reset local data, delete budget entries, unlink bank accounts, and request removal of synced data where applicable.

## Contact

Security or privacy questions should be sent to the application owner/developer using the contact information provided in the Plaid compliance profile.
