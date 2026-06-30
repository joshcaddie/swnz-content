# SWNZ Content

A Content-Snare-style content-collection tool in the **School Websites New Zealand** brand —
a real working app: **React + Vite + TypeScript** frontend on Render, backed by **Supabase**
(Postgres, Auth, Storage, Edge Functions) with **SMTP2GO** for email.

## What it does

- **Team dashboard** (email/password login): a Kanban **board** with drag-and-drop between stages,
  filters & search; **clients** CRUD; reusable **templates**.
- **Add Request wizard** — Templates → Essentials → Builder → Preview → Finalize, with a full
  page/section/field builder and ~27 field types.
- **Client portal** (`/c/:token`, no login): schools open a secure link, fill in answers (text,
  rich text, choices, ratings, file/image uploads…), save drafts, and submit for review — with
  optional email-code verification.
- **Review flow**: per-answer approve / request changes, comments, approve-all, live progress.
- **Email** via SMTP2GO: client invites, submission alerts, decisions, and daily reminders.

## Develop

```bash
cp .env.example .env.local     # add your Supabase URL + anon key
npm install
npm run dev                    # http://localhost:5173
```

## Build & deploy

```bash
npm run build                  # type-checks then bundles to dist/ (static)
```

Frontend deploys to Render as a Static Site (see [`render.yaml`](./render.yaml)); the backend is
Supabase. **Full setup — Supabase project, migrations, Edge Functions, SMTP2GO, Render env vars —
is in [`SETUP.md`](./SETUP.md).**

## Project layout

```
src/
  lib/        supabase client, auth provider, query client, DB types
  api/         React Query hooks (requests, clients, templates, answers, comments, portal, email)
  fields/      field-type registry + FieldInput (shared by portal & review)
  components/  TopChrome, TeamLayout, FieldModal, RichText
  routes/      Login, BoardPage, RequestDetailPage, WizardPage, TemplatesPage, ClientsPage, ClientPortal
  theme.ts     brand tokens
supabase/
  migrations/  schema, RLS, progress view, structure-clone functions
  functions/   Edge Functions (client portal API, email, reminders)
  seed.sql     demo board
project/                 original design prototype (reference)
docs/DESIGN_HANDOFF.md   original Claude Design handoff notes
```
