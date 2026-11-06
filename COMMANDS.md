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

**Deprecated / do not use yet**

| Command | Notes |
|---|---|
| `npm run deploy` | Scaffolded by Nest CLI. Not our deploy path (local Compose now; AWS ECS later). |
| `npm i -g @nestjs/cli` then `nest …` | Prefer `npx @nestjs/cli` / `npx nest` so the CLI matches the repo and nvm PATH does not break. |
| `npm i @nestjs/cli` in the app root | Installs the CLI as an **app** dependency and can block `nest new` with a `package.json` merge conflict. DevDependency via the Nest template is enough. |

---

## HTTP checks (current routes)

Nest is up only after `npm run start:dev`. Today the app still exposes the skeleton route; health/devices land when those modules exist.

| Command | What it does | When / why |
|---|---|---|
| `curl -s http://localhost:3000/` | `GET /` → `Hello World!` | Confirm the process is serving HTTP. |

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
| `npx prisma migrate dev --name <slug>` | Creates SQL under `prisma/migrations/`, applies it to local Postgres, regenerates the client | After you change `schema.prisma` (new model/field). Example already used: `--name init_devices`. Prefer this over `db push` so GitHub has migration history. |
| `npx prisma migrate dev` | Applies pending migrations; may prompt if schema drifted | After `git pull` if someone else added migrations. |
| `npx prisma migrate status` | Shows whether local DB matches migration history | Debugging “table does not exist” / drift. |
| `npx prisma generate` | Regenerates `@prisma/client` from the schema | After schema change if you did not run `migrate dev` (that already generates). |
| `npx prisma studio` | Opens a browser UI on the database | Inspect `Device` rows without writing SQL. |

**Do not use (for this project)**

| Command | Why |
|---|---|
| `npx prisma db push` | Updates the DB **without** migration files. We chose `migrate` (see `DECISIONS.md` D007). |
| `npx prisma init` | **Already done.** Re-running can overwrite `.env` / schema. |

---

## Nest generators

Use after `npm install`. Creates files and usually registers them in `app.module.ts`.

| Command | What it does | When / why |
|---|---|---|
| `npx nest generate module <name>` | Creates `src/<name>/<name>.module.ts` | New domain (prisma, devices, health). |
| `npx nest generate controller <name> --no-spec` | Creates a controller | HTTP routes for that domain. `--no-spec` skips an extra test file until we write tests on purpose. |
| `npx nest generate service <name> --no-spec` | Creates an injectable service | Business logic / Prisma calls. |

Short form: `npx nest g module devices` (same thing).

---

## Test, lint, format

| Command | What it does | When / why |
|---|---|---|
| `npm test` | Jest unit tests (`src/**/*.spec.ts`) | After logic changes. Does not start Docker. |
| `npm run test:watch` | Jest in watch mode | TDD loop. |
| `npm run test:cov` | Jest plus coverage report | When you want coverage numbers. |
| `npm run test:debug` | Jest with inspector, one worker | Breakpoint-debug a unit test. |
| `npm run test:e2e` | Jest e2e (`test/jest-e2e.json`) — boots `AppModule` and hits HTTP | After changing routes. Uses in-memory Nest, not Compose, until tests talk to Postgres. |
| `npm run lint` | Oxlint on `src/` and `test/` | Before commit if the linter is noisy. |
| `npm run format` | Prettier on `src/**/*.ts` and `test/**/*.ts` | Format TypeScript only. |

---

## Git (daily)

| Command | What it does | When / why |
|---|---|---|
| `git status` | Working tree vs last commit | Before add/commit. |
| `git add <paths>` | Stage files | Stage source, `prisma/`, lockfile, docs. **Not** `.env`. |
| `git commit -m "message"` | Creates a commit | Small commits: bootstrap, data, features. |
| `git push` | Uploads commits to GitHub `origin` | After a local commit. |
| `git remote -v` | Shows GitHub remotes | Confirm you are in the cloned repo. |

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
