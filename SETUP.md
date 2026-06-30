# SWNZ Content — Setup & Deploy Runbook

This app is a **React + Vite** frontend (hosted static on Render) backed by **Supabase**
(Postgres + Auth + Storage + Edge Functions) with **SMTP2GO** for email.

You'll do this once. Total time ~20–30 min. If you'd rather I (Claude) run the Supabase steps
for you, give me a **Supabase access token** (Account → Access Tokens) and your **project ref**,
and I'll apply migrations + deploy functions for you.

---

## 1. Create a Supabase project

1. Go to <https://supabase.com> → **New project**. Pick a name, region (Sydney is closest to NZ),
   and a database password (save it).
2. When it's ready, open **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://abcd.supabase.co`)
   - **anon public** key
   - **service_role** key (secret — never put in the frontend)
3. Note your **project ref** (the `abcd` part of the URL).

## 2. Apply the database schema

Install the CLI and link the project:

```bash
npm install            # installs the supabase CLI (already a dev dep)
npx supabase login     # opens browser, or: npx supabase login --token <ACCESS_TOKEN>
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push   # applies everything in supabase/migrations/
```

Load the demo board (optional, recommended for a non-empty first run):

```bash
npx supabase db execute --file supabase/seed.sql
# (or paste supabase/seed.sql into the SQL Editor in the dashboard)
```

This creates all tables, RLS policies, the `uploads` storage bucket, the progress view,
and the structure-clone functions.

## 3. Deploy the Edge Functions

```bash
npx supabase functions deploy client-request client-answer client-upload client-verify send-email send-reminders
```

Set the server-side secrets (these live in Supabase, never in the frontend):

```bash
npx supabase secrets set \
  SMTP2GO_API_KEY="<your smtp2go api key>" \
  SMTP2GO_SENDER="SWNZ Content <noreply@yourdomain.nz>" \
  PUBLIC_APP_URL="https://swnz-content.onrender.com" \
  NOTIFY_EMAIL="you@yourdomain.nz"        # where new-submission alerts go
# optional, protects the reminder cron endpoint:
npx supabase secrets set CRON_SECRET="$(openssl rand -hex 16)"
```

> **SMTP2GO:** create an API key at SMTP2GO → *Sending → API Keys*. Verify a sending domain
> (or sender) so `SMTP2GO_SENDER` is allowed. Until a domain is verified, deliverability is limited.

## 4. (Optional) Daily reminder emails

In the Supabase **SQL Editor**, schedule the reminder function with pg_cron + pg_net:

```sql
select cron.schedule(
  'swnz-daily-reminders', '0 8 * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT_REF>.functions.supabase.co/send-reminders',
       headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb
     ); $$
);
```

(Enable the `pg_cron` and `pg_net` extensions first under **Database → Extensions** if needed.)

## 5. Point the frontend at Supabase (Render)

In the **Render** dashboard → your `swnz-content` static site → **Environment**, add:

| Key | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | your Project URL |
| `VITE_SUPABASE_ANON_KEY` | your anon public key |

Then **Manual Deploy → Clear build cache & deploy** (env vars are baked in at build time, so a
rebuild is required after changing them).

Also add your Render URL to Supabase **Authentication → URL Configuration → Redirect URLs**:
`https://swnz-content.onrender.com`.

## 6. First run

1. Open the live URL → **Sign up** (creates your first team account; a profile row is auto-created).
2. Sign in → you'll see the board (with demo data if you ran the seed).
3. **Quick Actions → Add Request** → pick a template or start from scratch → build → send.
4. The client gets an email with a link like `https://…/c/<token>` (or copy it from the request).
5. They fill it in and submit; you review and approve from the request detail screen.

---

## Local development

```bash
cp .env.example .env.local          # fill with your project URL + anon key (or local supabase)
npm install
npm run dev                          # http://localhost:5173
```

To run the whole stack locally instead of the cloud project:

```bash
npx supabase start                   # needs Docker; spins up Postgres/Auth/Storage/Functions
npx supabase db reset                # applies migrations + seed.sql
npx supabase functions serve         # serves edge functions locally
# .env.local should point at the local URL + anon key printed by `supabase start`
```

## Architecture recap

- **Team** signs in with email/password (Supabase Auth). RLS gives any team member full access; the
  public has none.
- **Clients** never log in. Each request has an unguessable `public_token`; the portal (`/c/:token`)
  talks only to Edge Functions, which validate the token and act with the service role. Optional
  email-code verification per request.
- **Uploads** go to the private `uploads` bucket via short-lived signed URLs.
- **Email** is sent server-side via SMTP2GO from Edge Functions (key stays in Supabase secrets).
