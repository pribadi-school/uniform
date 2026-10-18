# Notes for AI assistants

Uniform inventory app for Pribadi school (SD/SMP/SMA). UI and README are in Indonesian. The owner is new to programming: explain simply, give copy-paste commands, avoid jargon.

## The two shortcuts the owner uses

- **"push"** → after the change passes `npm test`, `npx tsc --noEmit` and `npm run build`, commit and push **directly to `main`** (repo `github.com/pribadi-school/uniform`). No branches, no pull requests.
- **Live update** → the owner then runs one line in cPanel Terminal:
  ```bash
  bash ~/repositories/uniform/update.sh
  ```
  Always end a change by telling the owner to run this line.

## How a change reaches the live site

1. A push to `main` starts GitHub Actions **"Build for cPanel"** (`.github/workflows/deploy.yml`). It runs `tsc` and the tests, builds, and `scripts/package-release.mjs` publishes the ready-to-run app to the **`deploy` branch**. If a test fails, nothing is published. This takes about 1–2 minutes.
2. cPanel's checkout is on the `deploy` branch. Its `update.sh` (from `release/update.sh`) only runs `git pull` and restarts the app. There is **no npm install or build on cPanel**.
3. The running app needs **no npm packages**: `dist/api.mjs` is fully bundled, and the server uses only Node built-ins. `release/` holds the deploy branch's own `update.sh`, `package.json` (no dependencies), `README.md` and `.gitignore`. Never edit the `deploy` branch by hand.
4. `update.sh` on `main` only switches an old checkout to `deploy` once.

Pushing a change to `.github/workflows/*` from this PC is refused, because the saved Git login lacks the `workflow` scope. For those files, give the owner a GitHub web "new file" or "edit" link instead.

## How it is built

- Node.js 22.13+ server, no framework at runtime: `app.cjs` → `server/index.mjs` (HTTP + static files) → `dist/api.mjs` (bundled from `app/api/[...path]/route.ts` and `lib/server.ts`).
- Database: one SQLite file via `node:sqlite`. `server/database.mjs` runs `drizzle/*.sql` migrations (table `school_migrations`) and adapts SQLite to the small interface in `lib/database.ts`.
- `npm run build` (esbuild, `scripts/build-app.mjs`) writes `dist/public` (page + hashed assets) and `dist/api.mjs`. It keeps the previous build's assets.
- Business rules: `lib/server.ts`. Uniforms, sizes and the **staff list**: `lib/catalog.ts` (`staffNames`).
- Uniform photos: the owner drops large originals into `/assets` (Git-ignored), named like the uniform (capitals ignored). `python scripts/uniform-images.py` (needs Pillow) crops them to one 4:5 frame, writes small WebP files to `app/assets/uniforms` and regenerates `app/uniform-images.ts`; commit those. A renamed uniform needs a renamed photo.
- Accounts are off (`lib/access.ts`, `accountsEnabled=false`); everyone edits in shared mode. The old account mode depended on ChatGPT/Sites sign-in, which no longer exists.
- Optional login: env `SERAGAM_PASSWORD` turns on a password-only sign-in page (`server/login.mjs`, no username) with a 30-day session cookie and a Keluar link. Changing the password signs everyone out. After changing it in cPanel, restart with `pkill -f "lsnode:/home/pribadisch/repositories/uniform"`.

## Design system (follow it for every UI change)

All Pribadi apps share one look so they feel like one product. The owner wants it consistent, professional and free of the "AI template" look.

- **Brand:** `design-system/sekolah-pribadi-depok/MASTER.md`. It is a copy of the school's design system, shared with the website and the Parent–Teacher Consultation app (`E:\Appointment App for Teachers`, GitHub `pribadi-school/appointment`). If the brand changes, update every copy.
- **This app's rules:** `design-system/sekolah-pribadi-depok/pages/uniform-app.md`, which wins over MASTER.md. It covers:
  - the flat app style, the same as the appointment app
  - action blue `#0172bb`, never `#18a8fa`, for buttons and blue text
  - 1px borders, no shadows or gradients
  - stock status colours, and the type scale
  - **no icons inside coloured tiles or circles**
- **Tokens:** `app/globals.css` `:root`. Use them; never add a stray hex value. Inter is bundled via `@fontsource/inter`, because the CSP blocks Google Fonts.
- `DESIGN.md` only points to these files. `.impeccable/` is an outdated record from an earlier design tool, so ignore it.

## Live hosting (Hostinger cPanel, LiteSpeed/CloudLinux)

| What | Where |
|---|---|
| URL | https://uniform.pribadidepok.sch.id |
| Code | `/home/pribadisch/repositories/uniform`, a checkout of the **`deploy` branch** of github.com/pribadi-school/uniform |
| Node.js app | cPanel → Setup Node.js App, root `repositories/uniform`, startup `app.cjs`, Node 22.23, env `SERAGAM_ORIGIN=https://uniform.pribadidepok.sch.id` |
| Node env | `source /home/pribadisch/nodevenv/repositories/uniform/22/bin/activate` (only for manual node/npm commands; its `lib/node_modules` is intentionally empty) |
| Database | `~/seragam-data/inventory.sqlite` (outside the repo; back it up) |

Hosting gotchas:
- Don't run npm on cPanel. `node_modules` in the app folder is a CloudLinux symlink to the nodevenv; `npm ci` and `npm prune` replace it, so restore it with `ln -s ~/nodevenv/repositories/uniform/22/lib/node_modules ~/repositories/uniform/node_modules`.
- The cPanel **Restart** button does not reliably stop the old process. Real restart: `pkill -f "lsnode:/home/pribadisch/repositories/uniform"` (update.sh does it).
- The cPanel activate script reads unset variables (`CL_VIRTUAL_ENV`), so scripts with `set -u` must `set +u` around `source`.
- Code changes need a restart; data changes (stock entries) never do.

## Data history

The app used to run on Cloudflare Workers + D1 (`https://uniform.pribadisch.workers.dev`, still online read-only). On 2026-10-13 the data was copied into the cPanel SQLite file with `node scripts/import-cloudflare.mjs` (it only fills an empty database). Never commit data, `.sqlite` or export files: the repo is public.

## Developing on the owner's Windows PC

- Repo at `E:\Uniform Management App`. Run locally with `npm run dev` → http://127.0.0.1:5173 (dev database `.data/dev.sqlite`).
- Checks: `npm test`, `npx tsc --noEmit`, `npm run build`. `npm run lint` has older errors in UI files; don't treat them as new.
- Most files are stored with **CRLF** line endings; keep each file's existing endings so diffs stay small. `*.sh` must stay LF (`.gitattributes`).
- Git pushes use the **`pribadi-school`** GitHub login saved in Git Credential Manager (`git config credential.username pribadi-school`). The repo moved from `iqbalyusa/uniform` to `pribadi-school/uniform` on 2026-10-18. The `gh` CLI on this PC may be on another account, so don't rely on `gh` for this repo.
- If `node_modules` can't be deleted (Windows long paths), mirror an empty folder over it with `robocopy <empty> node_modules /MIR`, then reinstall.
