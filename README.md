# MarketingMind AI â€” MVP

A practical marketing operations dashboard for small teams: authenticated website management, SEO audit history and checkpoint comparisons, CRM with buyer personas, profitability planning, plus a connector-ready publishing architecture.

## Stack

- **Next.js + TypeScript** â€” one web project, deployable on Vercel's free tier
- **Supabase** â€” free-tier Postgres, email/password authentication and row-level security
- **Server Actions** â€” simple forms without a separate backend service
- **Plain responsive CSS** â€” no paid component library

## What works now

- Supabase email/password sign-up, sign-in, sign-out and protected dashboard
- Websites: add and list monitored sites
- SEO: save manual audit results, history, and 30/90/180/365-day score comparisons
- CRM: contacts, buyer-persona notes and lead status/value
- Finance: live break-even, contribution margin, revenue and profit calculator
- Tenant-safe database policies: every user sees only their own records
- Publishing queue and connector-account schema
- Typed adapter catalog for Meta, Google Business Profile, GA4, GSC, Semrush, Ahrefs, WordPress, Shopify, YouTube, LinkedIn and X

Provider OAuth and automated audits/publishing are intentionally adapters for the next iteration: those APIs require provider apps, reviews and credentials that cannot be bundled into a repository.

Google Search Console OAuth and 28-day reporting are implemented. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a 32-byte base64 `CONNECTOR_ENCRYPTION_KEY` in Vercel, then register `/api/connectors/gsc/callback` as the Google OAuth redirect URI.

## Quick setup (no local Supabase required)

1. Create a free project at Supabase.
2. In **SQL Editor**, paste and run `supabase/migrations/0001_initial_schema.sql`.
3. In **Authentication â†’ URL Configuration**, set Site URL to `http://localhost:3000` for local use. For deployment, use the Vercel URL.
4. Copy `.env.example` to `.env.local`. Get the Project URL and anon key from **Project Settings â†’ API** and fill them in.
5. Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, create an account, confirm the email, and sign in.

## Deploy free on Vercel

1. Push this folder to the private GitHub repository.
2. In Vercel, choose **Add New Project**, import the repository and keep the detected Next.js settings.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL` in Vercel Environment Variables.
4. Deploy, then update Supabase's Site URL to the production URL.

## Product structure

```text
app/
  (dashboard)/          Protected modules and server actions
  login/                Authentication UI/actions
lib/
  connectors/           Provider-neutral connector contract/catalog
  supabase/              Server client and session middleware
supabase/
  migrations/           Versioned schema and security policies
```

## SEO comparison rule

The current score is compared with the nearest recorded audit at or before each checkpoint (30, 90, 180 or 365 days ago). A dash means there is not yet enough history. In production, an automated audit worker can populate `audit_runs.details` with page-level issues and use scheduled jobs to create checkpoints.

## Connector implementation path

Each provider implements `MarketingConnector` in `lib/connectors/types.ts`. OAuth callback handlers should save refreshable credentials through a server-only encryption service; never expose them to the browser. A scheduled worker claims due `scheduled_posts`, calls the provider adapter, then records `published`, `external_post_id`, or a retryable failure.

Recommended order: Google Business Profile + Meta publishing, GSC + GA4 reporting, WordPress/Shopify, then the remaining paid or restricted providers. Semrush and Ahrefs typically require paid API access.

## Security notes

- The anon key is safe for browser/server use because database RLS is enabled.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or provider secrets with a `NEXT_PUBLIC_` prefix.
- Connector credentials need application-level encryption before real OAuth connections are enabled.
- The migration's ownership policies cover select, insert, update and delete.

## Suggested next milestones

1. Add organization/workspace membership for teams.
2. Add OAuth and publishing worker for Google Business Profile and Meta.
3. Add an automated crawler/Lighthouse worker for SEO audits.
4. Persist finance scenarios and add channel-attributed campaign costs/revenue.
5. Add CSV contact import and a kanban lead pipeline.

