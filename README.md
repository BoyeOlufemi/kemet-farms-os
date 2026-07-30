# Kemet Farms OS

Prototype field-operations simulator for turning low-bandwidth staff messages
into traceable assignments, completion records, exceptions, and supervisor
review.

**Status:** prototype/demo-ready, not production-verified.
The repository does not demonstrate a live WhatsApp deployment or validated
agronomic recommendations.

## Problem and value

Field assignments are frequently coordinated through calls and chat messages,
which makes ownership, completion, and exceptions difficult to audit. Kemet
Farms OS demonstrates a workflow that structures those interactions and keeps
the operational state visible to supervisors.

## Implemented demo architecture

- React and TypeScript operations interface
- Firebase Authentication, Firestore, and Storage integration
- Local browser storage for offline/demo state
- Express endpoints for AI-assisted drafts and analysis
- WhatsApp, Supabase, and n8n artifacts that remain pre-production designs

AI endpoints fail closed: if analysis is unavailable, the API returns
`AI_REVIEW_REQUIRED` and does not fabricate agronomic advice, receipt values, or
task completion.

## Repo Layout
| Folder/File | Purpose | Notes |
|---|---|---|
| `Workflows/` | n8n workflow JSON | Commit |
| `Supabase/` | Schema + pre-flight checklist | Contains public project ref only; no secrets |
| `Voice/` | Staff SOPs and outreach macros | Commit |
| `Instructions/` | Crop schedule and runbooks | Commit |
| `References/` | Architecture notes | Commit |
| `Examples/` | Usage examples/reference | Commit |
| `Notes/` | Design notes | Commit |
| `Simulator/` | Screenshots, simulator HTML, generated videos, temp build scripts | **Gitignored** |
| `.gitignore` | Ensures no screenshots, videos, build scripts, secrets are committed | Commit |

## Quickstart

```bash
npm install
npm run dev
```

Set `GEMINI_API_KEY` only for local AI endpoint testing. Firebase client
configuration is not a substitute for Firestore authorization rules.

## Security

- Firestore operational collections require an authenticated user.
- Administrator access must be assigned through Firebase custom claims.
- Do not commit database, Firebase Admin, Twilio, or Supabase credentials.
- The current authenticated-user rule is a prototype baseline. Production use
  requires farm-scoped membership and operator/supervisor roles.
- AI-generated content requires human review and an approved, versioned farm
  SOP before field dispatch.

## Production readiness

Before live use, select one authoritative data store, implement authenticated
server APIs and provider webhooks, add role-based authorization, replace
browser-only synchronization with durable event processing, and complete the
verification checklist in `Supabase/twilio_supabase_checklist.md`.

The production bundle currently builds, but the legacy TypeScript model has
known type errors and does not yet pass `tsc --noEmit`. Treat type-system
remediation and automated tests as required engineering work, not completed
validation.
