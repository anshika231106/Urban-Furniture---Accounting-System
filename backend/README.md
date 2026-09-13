# Urban Furniture — Accounting System (Backend)

Backend for the Urban Furniture Accounting System MVP. Node.js + Express +
Prisma ORM + PostgreSQL (hosted on Neon).

---

## Prerequisites

Before you start, make sure you have:

- **Node.js** v18 or higher (`node -v` to check)
- **npm** (comes with Node)
- **Git**
- Access to the project's **Neon** database (ask an admin to invite you to
  the Neon project, or share the connection strings securely — see below)

---

## 1. Clone the repo

```bash
git clone <repo-url>
cd Urban-Furniture---Accounting-System/backend
```

## 2. Install dependencies

```bash
npm install
```

## 3. Set up your `.env` file

This project connects to a **shared Neon Postgres database**. You do **not**
need to create your own database — everyone on the team points to the same
Neon project (dev/staging), so schema changes and seed data stay in sync.

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```
   *(If `.env.example` doesn't exist yet, create `.env` manually using the
   template below.)*

2. Get the two connection strings from whoever manages the Neon project
   (Admin will share these securely — **never** commit them, **never**
   paste them in Slack/Discord in plain view of a public channel):

   ```
   DATABASE_URL="postgresql://<user>:<password>@<pooler-host>/<db>?sslmode=require&channel_binding=require"
   DIRECT_URL="postgresql://<user>:<password>@<direct-host>/<db>?sslmode=require&channel_binding=require"
   ```

   - `DATABASE_URL` → the **pooled** connection (hostname contains `-pooler`).
     Used by the app at runtime.
   - `DIRECT_URL` → the **direct** connection (same hostname, no `-pooler`).
     Used only by Prisma CLI for migrations.

   > If you have your own Neon account with access to the project, you can
   > get these yourself: Neon dashboard → project → **Connect** → toggle
   > "Connection pooling" on/off to get each variant → click **Show password**
   > before copying.

3. Save `.env` in the `backend/` folder. It is already git-ignored — **do
   not** remove it from `.gitignore` or commit it.

## 4. Generate the Prisma Client

```bash
npx prisma generate
```

This reads `prisma/schema.prisma` and generates the typed client into
`src/generated/prisma`. Run this again any time you pull changes that touch
`schema.prisma`.

## 5. Apply the database schema

The database schema is already created (via migrations committed to this
repo). You just need to make sure your local Prisma Client matches it:

```bash
npx prisma migrate deploy
```

This applies any migrations in `prisma/migrations/` that haven't been
applied yet — it does **not** create new migrations, so it's safe to run
even if you're not making schema changes.

> ⚠️ **Do not run `prisma migrate dev` unless you are intentionally
> changing the schema.** Since we share one dev database, `migrate dev`
> can create new migration files and prompt for destructive resets. If you
> need to change `schema.prisma`, talk to the team first, then see
> [Making schema changes](#making-schema-changes) below.

## 6. (Optional) Inspect the database visually

```bash
npx prisma studio
```

Opens a browser GUI at `http://localhost:5555` where you can browse/edit
rows directly — useful for checking seed data or debugging.

## 7. Run the seed script (first-time setup only)

Populates the required default Chart of Accounts and Journals (see
`MVP.md` §4.3 / §4.4). **Skip this if the shared dev database is already
seeded** — check with the team, or open Prisma Studio and see if
`ChartOfAccount` / `Journal` tables already have rows.

```bash
npx prisma db seed
```

## 8. Start the dev server

```bash
npm run dev
```

---

## Making schema changes

Because everyone shares one Neon dev database, schema changes need a bit of
care so we don't clobber each other's work:

1. Pull the latest `main` first: `git pull origin main`
2. Create a feature branch (see repo root convention, e.g.
   `feature/phase-3-core-ledger`)
3. Edit `prisma/schema.prisma`
4. Run:
   ```bash
   npx prisma migrate dev --name <short-description>
   ```
   This creates a new migration file **and** applies it to the shared dev
   DB immediately — so let the team know before you do this, ideally in a
   sync window, to avoid two people generating conflicting migrations at
   once.
5. Commit the new folder under `prisma/migrations/` along with your code
   changes.
6. Push your branch and open a PR.

**Never edit an existing migration file that's already been merged to
`main`.** If you need to change something already migrated, create a new
migration on top of it instead — editing old migrations desyncs everyone
else's local Prisma Client state.

---

## Project structure

```
backend/
├── prisma/
│   ├── schema.prisma       # data model (source of truth for DB structure)
│   └── migrations/         # versioned SQL migrations — do not hand-edit
├── src/
│   ├── config/             # env/config loading
│   ├── controllers/        # request handlers
│   ├── data/                # seed scripts, static data
│   ├── middleware/         # auth, role checks, error handling
│   ├── routes/             # Express route definitions
│   ├── utils/              # shared helpers
│   ├── generated/prisma/   # auto-generated Prisma Client (git-ignored)
│   ├── app.js
│   └── server.js
├── prisma.config.ts        # Prisma CLI config (connection URLs, migration path)
└── .env                    # local secrets (git-ignored, not committed)
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Error: environment variable not found: DATABASE_URL` | Your `.env` is missing or not in `backend/`. Confirm it's there and correctly named. |
| `Can't reach database server` | Check your `DATABASE_URL`/`DIRECT_URL` are correct and your network allows outbound Postgres connections (some corporate/campus wifi blocks port 5432). |
| Prisma Client types don't match schema | Run `npx prisma generate` again. |
| `Already in sync, no schema change found` when you expected a migration | You likely need to `git pull` first — someone else may have already added the migration you're trying to create. |
| Migration conflicts with a teammate's | Talk it out — usually means two people edited `schema.prisma` on separate branches at the same time. Rebase and regenerate one clean migration. |

---

## Questions?

Ping the team channel or the project admin before running any destructive
Prisma command (`migrate reset`, `db push --force-reset`, etc.) against the
shared dev database — those wipe data for everyone.