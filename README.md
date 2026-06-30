# Family Ledger Template

A responsive household bookkeeping PWA for daily expense entry, month detail review, and EUR/CNY-style multi-currency analysis.

This is the public template version. It does not include any private ledger workbook, migration bundle, environment file, or deployment account.

## Data Modes

| Mode | Storage | Sync |
| --- | --- | --- |
| Local trial | Browser localStorage | No |
| Cloud household | Supabase PostgreSQL + Auth | Yes |

## Setup

```bash
npm install
npm run dev
```

Without `.env.local`, the app runs in local trial mode.

For cloud sync:

1. Create a Supabase project.
2. Run all SQL files in `supabase/migrations/` in filename order.
3. Copy `.env.example` to `.env.local`.
4. Fill:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

5. Configure Supabase Auth email OTP. The email template should include `{{ .Token }}`.
6. Deploy with Cloudflare Workers:

```bash
npm run deploy
```

## Default Categories

The template starts with common household expense categories and one generic income category named `收入`.
Add, rename, or deactivate categories in Settings for your own household.

## Updating Your Fork

If you forked this template, pull updates from the public template repository when a new version is published, then run:

```bash
npm install
npm run build
```

Cloud users should also run any new SQL files in `supabase/migrations/` in filename order before using features that depend on new database functions.

## Private Data Safety

Do not commit:

- `.env.local`
- personal Excel ledgers
- migration bundles
- exported backups
- `dist/`
- `outputs/`
