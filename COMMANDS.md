# GridMind — commands

Commands we actually use (or that already exist as npm scripts) for this repo. Run them from the **git repo root** (`gridmind/`), unless noted.

Stack this file is allowed to document: **Node 24, npm, NestJS, Jest, Prisma 6, PostgreSQL 16, Redis 7, Docker Compose, Git.** Do not add Azure, AWS, LangGraph, or TypeORM commands until those are in the stack.

When a command is replaced, mark it **deprecated** here. Do not delete history without a replacement note.

---

## Runtime (Node)

| Command | What it does | When / why |
|---|---|---|
| `node -v` | Prints the Node version | Confirm you are on **v24.x** before install or `nest`/`prisma` work. This project standardizes on Node 24 LTS (`nvm alias default 24`). |
| `npm -v` | Prints npm version | Sanity check after `nvm use 24`. |
| `nvm use 24` | Switches this shell to Node 24 | If `node -v` is 26 or anything else. |
| `nvm alias default 24` | New terminals default to Node 24 | Already set on the first machine; re-run only if the default drifts. |

---

## Install

| Command | What it does | When / why |
|---|---|---|
| `npm install` | Installs dependencies from `package-lock.json` | After clone, or after pulling lockfile changes. |
| `cp .env.example .env` | Creates a local env file (not committed) | Once per machine. `.env` holds `PORT`, `DATABASE_URL`, `REDIS_URL`. Never commit `.env`. |

---

## Run the API

| Command | What it does | When / why |
|---|---|---|
| `npm run start:dev` | Compiles TypeScript, starts Nest, **rewatches** files | Daily local development. Entry: `src/main.ts` → default `http://localhost:3000`. |
| `npm run start` | Starts Nest **without** file watch | One-off run; prefer `start:dev` while coding. |
| `npm run start:debug` | Watch mode plus Node inspector | When you attach a debugger. |
| `npm run start:prod` | Runs `node dist/main` | Only after `npm run build`. How production would start a compiled process; not used with Compose yet. |
| `npm run build` | Compiles `src/` to `dist/` | Before `start:prod`, or to check TypeScript compiles. |

`Ctrl+C` stops a running Nest process.

---

## Postman (local collection)

Collection v3 YAML under `postman/` (Cursor / Postman Local View). Select environment **Local**. Nest and Compose must already be running.

| What | Path |
|---|---|
| Collection | `postman/collections/GridMind API/` |
| Folders | `01 Bootstrap`, `02 Health`, `03 Devices`, `04 Readings` |
| Environment | `postman/environments/Local.environment.yaml` (`baseUrl` = `http://localhost:3000`) |

When a Nest route is added or changed, add or edit the matching `*.request.yaml` in the same turn (see `.cursor/rules/postman-collection.mdc`).

**Deprecated / do not use yet**

| Command | Notes |
|---|---|
| `npm run deploy` | Scaffolded by Nest CLI. Not our deploy path (local Compose now; AWS ECS later). |
| `npm i -g @nestjs/cli` then `nest …` | Prefer `npx @nestjs/cli` / `npx nest` so the CLI matches the repo and nvm PATH does not break. |
| `npm i @nestjs/cli` in the app root | Installs the CLI as an **app** dependency and can block `nest new` with a `package.json` merge conflict. DevDependency via the Nest template is enough. |

---

## HTTP checks (current routes)

Nest is up only after `npm run start:dev`. Postgres must be up for `/devices`, `/devices/:id/readings`, and `/health`.

| Command | What it does | When / why |
|---|---|---|
| `curl -s http://localhost:3000/` | `GET /` → `Hello World!` | Confirm the process is serving HTTP. |
| `curl -s http://localhost:3000/health` | `GET /health` → Postgres ping | Confirm Nest can reach Postgres. |
| `curl -s http://localhost:3000/devices` | `GET /devices` → JSON array | List devices. |
| `curl -s -X POST http://localhost:3000/devices -H 'Content-Type: application/json' -d '{"name":"Inverter-01","type":"inverter"}'` | `POST /devices` | Create a device. Second POST with the **same name** must be **409 Conflict**. Copy the returned `id` as `DEVICE_ID`. |
| `curl -s -X POST http://localhost:3000/devices/$DEVICE_ID/readings -H 'Content-Type: application/json' -d '{"metric":"power_kw","value":12.5}'` | Stores a telemetry row | Device must exist. Unknown uuid → **404**. |
| `curl -s http://localhost:3000/devices/$DEVICE_ID/readings` | Lists readings for that device | Newest `recordedAt` first. |

---

## Docker Compose (Postgres + Redis)

Containers are **separate processes**. Nest does not start them.

| Command | What it does | When / why |
|---|---|---|
| `docker compose up -d` | Starts Postgres 16 and Redis 7 in the background | Before Prisma migrate or any DB-backed API work. |
| `docker compose ps` | Shows container status | Confirm both services are running. |
| `docker compose logs -f postgres` | Streams Postgres logs | When migrate or the API cannot connect. |
| `docker compose logs -f redis` | Streams Redis logs | When Redis is the suspect (client not wired in Nest yet). |
| `docker compose down` | Stops containers; **keeps** the `postgres_data` volume | End of day / free ports. Data survives. |
| `docker compose down -v` | Stops containers and **deletes** the volume | Reset local DB to empty. Destructive. Re-run `prisma migrate` after. |

Compose credentials (from `docker-compose.yml` / `.env.example`): user `gridmind`, password `gridmind`, db `gridmind`, Postgres `localhost:5432`, Redis `localhost:6379`.

---

## Prisma (Postgres)

Requires Compose Postgres up and `.env` `DATABASE_URL`. Schema: `prisma/schema.prisma`. Migrations: `prisma/migrations/`.

| Command | What it does | When / why |
|---|---|---|
| `npx prisma migrate dev --name <slug>` | Creates SQL under `prisma/migrations/`, applies it to local Postgres, regenerates the client | After you change `schema.prisma` (new model/field). Already used: `--name init_devices`, `--name unique_device_name`, `--name init_readings`. Prefer this over `db push`. Run via **this repo’s** Prisma 6 (`npm install` first). Bare `npx prisma` in a sandbox can download Prisma 8 by mistake. |
| `npx prisma migrate deploy` | Applies **existing** migration files; does not create a new one | After `git pull`, or when the SQL is already in `prisma/migrations/` (e.g. unique name). |
| `npx prisma migrate status` | Shows whether local DB matches migration history | Debugging “table does not exist” / pending unique index. |
| `npx prisma migrate resolve --rolled-back <migration_name>` | Marks a failed migration as rolled back so it can be retried | After `migrate deploy` fails (example: unique index blocked by duplicate `Inverter-01` rows). Fix the data, then `migrate deploy` again. |
| `npx prisma generate` | Regenerates `@prisma/client` from the schema | After schema change if you did not run `migrate dev` (that already generates). |
| `npx prisma studio` | Opens a browser UI on the database | Inspect `Device` rows without writing SQL. |

**Do not use (for this project)**

| Command | Why |
|---|---|
| `npx prisma db push` | Updates the DB **without** migration files. We chose `migrate` (see `DECISIONS.md` D007). |
| `npx prisma init` | **Already done.** Re-running can overwrite `.env` / schema. |

---

## Nest generators (pattern only — do not log every domain)

Use after `npm install`. Replace `<name>` (`devices`, `health`, `readings`, …). `--no-spec` skips a generated test file. Short form: `npx nest g module <name>`.

Do **not** add a new row here each time we scaffold a module. The pattern is enough.

| Command | What it does | When / why |
|---|---|---|
| `npx nest generate module <name>` | Creates `src/<name>/<name>.module.ts` (often registers it on `AppModule`) | New domain folder. |
| `npx nest generate controller <name> --no-spec` | Creates a controller | HTTP routes. Edit `@Controller(...)` if the path is nested (e.g. `devices/:deviceId/readings`). |
| `npx nest generate service <name> --no-spec` | Creates an injectable service | Business logic / Prisma calls. |

---

## Test, lint, format

| Command | What it does | When / why |
|---|---|---|
| `npm test` | Jest unit tests (`src/**/*.spec.ts`) | After logic changes. Does not start Docker. |
| `npm run test:watch` | Jest in watch mode | TDD loop. |
| `npm run test:cov` | Jest plus coverage report | When you want coverage numbers. |
| `npm run test:debug` | Jest with inspector, one worker | Breakpoint-debug a unit test. |
| `npm run test:e2e` | Jest e2e (`test/jest-e2e.json`) — boots `AppModule` and hits HTTP | After changing routes. Uses in-memory Nest, not Compose, until tests talk to Postgres. |
| `npm run lint` | Oxlint on `src/` and `test/` | Before commit; also a required CI check. |
| `npm run format` | Prettier **writes** `src/**/*.ts` and `test/**/*.ts` | Fix formatting locally. |
| `npm run format:check` | Prettier **checks** without writing | CI and before commit; fails if files are unformatted. |

---

## Git (daily)

| Command | What it does | When / why |
|---|---|---|
| `git status` | Working tree vs last commit | Before add/commit. |
| `git add <paths>` | Stage files | Stage source, `prisma/`, lockfile, docs. **Not** `.env`. |
| `git commit -m "message"` | Creates a commit | Small commits: bootstrap, data, features. |
| `git push` | Uploads commits to GitHub `origin` | After a local commit. |
| `git remote -v` | Shows GitHub remotes | Confirm you are in the cloned repo. |
| `git switch -c <branch>` | Creates and checks out a feature branch | All work except hotfixes on `main`. Example: `git switch -c feat/readings`. |
| `git stash push -u -m "message"` | Saves tracked + untracked changes, cleans the working tree | Park unfinished work without a commit. `-u` includes new files. |
| `git stash list` | Lists stashes | See what you saved. |
| `git stash pop` | Restores the latest stash and **removes** it from the list | Continue that work. |
| `git stash apply` | Restores the latest stash and **keeps** it | When you might need the same stash again. |
| `git stash drop` | Deletes the latest stash | After you are sure you do not need it. |

---

## GitHub CI and pull requests

Workflow file: `.github/workflows/ci.yml`. Job name: **lint, format, test, build**. Runs on every PR and on pushes to `main`.

| Command | What it does | When / why |
|---|---|---|
| `npx prisma validate` | Parses `schema.prisma` (no Postgres required) | CI: catch a broken schema before tests. |
| `npm ci` | Clean install from the lockfile | CI only (reproducible). Locally keep using `npm install`. |

**Not a CI job:** merge conflicts. GitHub already blocks Merge until the PR is conflict-free.

**GitHub UI (required once per repo):**

1. **Settings → General → Pull Requests → Automatically delete head branches** — on. After merge, GitHub deletes the feature branch. On the merged PR, **Restore branch** brings it back.
2. **Settings → Rules → Rulesets** (or Branch protection on `main`): require the status check **lint, format, test, build**. Do not require a review while you are the only contributor (it would block you).

---

## One-time bootstrap (already done — do not repeat)

| Command | What it was for |
|---|---|
| `nvm install 24` | Install Node 24 via nvm |
| `npx @nestjs/cli new . --package-manager npm` | Scaffold Nest (CJS + Jest) into this folder |
| `npx prisma init` | Created `prisma/schema.prisma` and Prisma config |

---

## Observe (optional; not required for local Hello World)

| Command | What it does | When / why |
|---|---|---|
| `npx @nestjs/observe link` | Writes Observe key pair into `.env` | Only if you use Nest Observe dashboards. Keys stay in `.env`, not git. |
