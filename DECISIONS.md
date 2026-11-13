# GridMind — decision log

Living record of meaningful technical and process choices. Newest entries go at the **bottom**. Do not rewrite history: if a choice is reversed, add a new entry that supersedes the old one and leave the original in place.

Each entry answers: **what we chose, why, what we gave up, and what we explicitly deferred.**

---

## How to add an entry

1. Next number (`D015`, …).
2. Date (the day the choice was made).
3. Status: `accepted` | `superseded by Dxxx` | `deferred`.
4. Context, decision, reasons, tradeoff, alternatives.

Interview use: this file is the “why” behind the repo, not a tutorial.

---

## D001 — Target architecture (stack), implemented in layers

- **Date:** 2026-10-23
- **Status:** accepted

**Context:** Proposed stack (portfolio screenshot) vs the urge to enable every box on day one.

**Decision:** Treat the screenshot as the **target**, not the first commit. Sequence:

1. Git + GitHub + NestJS API that boots
2. Docker Compose with PostgreSQL and Redis
3. Users, auth, devices, telemetry, anomalies
4. Tests, GitHub Actions, security scanning
5. AI assistant that calls our own APIs
6. Observability
7. AWS last, once local is solid

**Target stack (accepted, not all installed yet):**

| Area | Choice |
|---|---|
| Language / runtime | TypeScript on **Node.js 24 LTS** |
| API framework | **NestJS**, REST |
| Data | **PostgreSQL** (users, devices, telemetry, anomalies) |
| Cache | **Redis** (summaries, device status) |
| Local ops | Docker, Docker Compose |
| CI | GitHub Actions, tests, dependency/security scanning |
| AI | LangGraph, LLM API, structured outputs, tools, RAG, embeddings, vector search, MCP |
| Cloud | AWS ECS, ALB, Aurora PostgreSQL, CloudWatch, Lambda, IAM, Secrets Manager |
| Dev tools | Cursor, Git, GitHub, Postman, Jest |

**Why layer:** AWS, LangGraph, RAG, and ECS before a working API produce a repo that does not run and a builder who cannot debug. A working local slice is the confidence loop (request in, data out).

**Tradeoff:** Resume keywords appear later in git history. Early commits look “small” on purpose.

**Deferred until the API can create a device and store a reading:** AWS, LangGraph, CI.

---

## D002 — Node.js 24 LTS, not the Node 26 Current that was on the machine

- **Date:** 2026-10-26
- **Status:** accepted

**Context:** `node -v` was `v26.0.0`. The written stack said Node.js 24 LTS. Installed **nvm 0.40.3** and **Node v24.22.1** (npm 11.19.1), with `nvm alias default 24`.

**Decision:** Standardize on **Node 24 LTS** for local, later Docker, and CI.

**Why:**

- Matches the stack that will be written on the resume.
- `26.0.0` was the first 26 cut (Current-line), not a polished LTS-oriented toolchain for Nest/Jest/images.
- NestJS and ecosystem packages are far more often tested on 24.
- `default 24` stops new terminals from scaffolding with 26 by accident.

**Tradeoff:** Not on “newest Node.” Newest is not a hiring advantage if the app is the first to hit a breaker.

**Alternatives:** Stay on 26; use 22 (previous LTS).

---

## D003 — NestJS as the HTTP framework (Node is the runtime, not a framework)

- **Date:** 2026-10-23 (framework); clarified 2026-11-04
- **Status:** accepted

**Context:** Previous org: TypeScript/Node on **Azure Functions** (monorepo of Function Apps, `host.json`, Cosmos/ADX). Question: can Node be “a framework alone”? No — Node is the runtime. Express/Nest/Functions are how you structure the server.

**Decision:** GridMind is a **long-running NestJS REST API on Node 24**, not Azure Functions and not Express-from-scratch.

**Why Nest:**

- Matches the proposed stack: modules, DTO validation, auth, error handling, business logic.
- Gives structure companies actually use (modules, controllers, providers, tests).
- Express-from-scratch would mean inventing routing, validation, and folder rules while also learning Docker, Postgres, and AI.
- Functions are a poor fit for the portfolio goal (ECS/Docker, one modular API). Prior job already demonstrated Functions.

**Tradeoff:** More ceremony than a single `index.ts`. Worth it for modular growth (devices, telemetry, auth).

**Clarification we locked:** “Bootstrapped a TypeScript NestJS API” means generating a runnable skeleton (`nest new` / first `Hello World!`), not writing product features. Nest’s `bootstrap()` in `main.ts` is the **runtime** start of that process.

---

## D004 — CommonJS + Jest, not ESM + Vitest

- **Date:** 2026-10-27
- **Status:** accepted

**Context:** Nest 12 generator asked: ESM (Vitest) vs CJS (Jest). Stack screenshot listed **Jest**.

**Decision:** **CJS (CommonJS) with Jest.**

**Why:**

- Aligns with the published stack and most Nest examples, Stack Overflow, and many codebases.
- ESM + Vitest is fine but adds module-resolution surprises on top of Docker, Postgres, auth, and AI.
- Jest is already familiar from maintenance work.

**Tradeoff:** Not on the newest Nest template defaults (ESM/Vitest). We can revisit if the ecosystem clearly standardizes; until then, Jest is the testing story.

**Also generated:** `@nestjs/observe` was enabled in the wizard (Yes). **Keep it for now**; production observability story remains CloudWatch + structured logs later. Not worth re-scaffolding. Observe keys stay out of git (`.env`).

---

## D005 — Local data plane: Docker Compose with PostgreSQL 16 and Redis 7

- **Date:** 2026-10-23 (planned); running by 2026-11-04
- **Status:** accepted

**Decision:**

- **Do not** install Postgres/Redis as long-lived native Mac services.
- `docker-compose.yml`: Postgres 16 (`gridmind`/`gridmind`/`gridmind` on `5432`) and Redis 7 on `6379`, with a named volume for Postgres data.
- Commit `.env.example`; never commit `.env`.
- Aurora PostgreSQL is the **cloud** flavor later, not the local learning database.

**Why:** Compose is a repeatable environment (the DevOps line on the stack) and is the same mental model as later containers/ECS. Local Postgres is “identical enough SQL” to Aurora. Redis is present so caching is not a surprise add-on months later.

**Tradeoff:** Docker is a dependency on the laptop. Native installs would be less portable and harder to document.

**Deferred:** Wiring Redis into Nest (caching device status/summaries) until after devices + readings exist.

---

## D006 — Do not host GridMind on Azure Functions (or wrap Express/Nest in Functions)

- **Date:** 2026-11-04
- **Status:** accepted

**Context:** Prior org: Azure Functions v2 programming model, TypeScript/Node, one Function App per domain folder (`account`, `devices`, …), Cosmos DB, Azure Identity, Azure Data Explorer. The team had **shaped folders like Express/Nest** (thin triggers, domain services) intending to migrate the host; migration never happened.

**Decision:** GridMind stays a **Nest process** (later Docker/ECS). We will not put Express or Nest behind a catch-all Azure Function.

**Why:**

- Functions-on-Node was already demonstrated at work.
- This project’s cloud target is **AWS**, not Azure.
- Express/Nest-on-Functions is possible (`azure-function-express`, `@nestjs/azure-func-http`) but fights cold starts and double routing; Azure App Service (or a container) is the natural Express/Nest host.
- Folder shape ≠ framework. Hexagonal layout can make a **future** host swap easier; it does not require using Functions today.

**Tradeoff:** Not a 1:1 rebuild of the last job’s hosting model. That is intentional: show a second hosting model (long-running API + containers).

**What we still take from the old job:** domain folders, thin HTTP adapters, keep business rules out of the host file — in Nest that means controllers stay thin and services own logic.

---

## D007 — Prisma 6 over TypeORM (and over Prisma 7 for now)

- **Date:** 2026-11-04
- **Status:** accepted (schema + `init_devices` migration applied; Nest `PrismaService` and HTTP routes not in `src/` yet)

**Context:** Need an ORM so Nest talks to Postgres without raw SQL for every query. GridMind will grow devices → readings → anomalies (relational, foreign keys).

**Decision:** **Prisma 6** (`prisma@6`, `@prisma/client@6`) as the data layer. Wrap the client in a Nest `PrismaService`. Use **`prisma migrate`**, not `db push`. First model: **Device** (id, name, type, status). Readings are the next schema step.

**Why Prisma vs TypeORM:**

- **Source of truth:** one `schema.prisma` vs entity classes scattered with decorators.
- **Migrations:** first-class; TypeORM migrations are easy to skip and painful later.
- **Types:** generated client matches the schema; good interview artifact (“open the schema, explain the domain”).
- **Learning load:** TypeORM’s decorators stack on Nest’s decorators while Nest itself is still new.
- TypeORM’s advantage (`@nestjs/typeorm` feels more “native Nest”) is real but secondary here.

**Why pin Prisma 6:** Prisma 7’s driver-adapter setup is extra friction on day one of the data layer.

**Why migrate not `db push`:** `prisma/migrations/` is the database history for GitHub and later Aurora. `db push` skips that history.

**Tradeoff:** Prisma DSL is another language to learn; Nest integration is a small wrapper, not official TypeORM-level. Accepted.

**Alternatives:** TypeORM; Drizzle (too extra for a first Nest project); raw `pg`.

**Progress (2026-11-06):** `PrismaModule` / `PrismaService` are in `src/` (`$connect` on init). `DevicesService` calls `prisma.device.create` / `findMany`. Migrations: `init_devices`, then `unique_device_name` (see D013).

---

## D008 — Nest `ConfigModule` as the only env entry point

- **Date:** 2026-11-04
- **Status:** accepted (ConfigModule wired; Observe still uses `process.env`)

**Decision:** `@nestjs/config` with `ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' })`. Application code should inject `ConfigService`, not sprinkle `process.env` (except leftover Observe bootstrap until that is cleaned up).

**Why:** One load of `.env`. Later, AWS Secrets Manager can supply the same names (`DATABASE_URL`, `REDIS_URL`, `PORT`) without rewriting services.

**Tradeoff:** A bit more wiring than `process.env.PORT`. Worth it before credentials multiply.

**Progress (2026-11-06):** `ConfigModule.forRoot` is in `src/app.module.ts`. `main.ts` still reads `process.env.PORT` for `listen`. Observe still reads `process.env.OBSERVE_*`. No service injects `ConfigService` yet.

---

## D009 — Global `ValidationPipe` for DTO validation

- **Date:** 2026-11-04
- **Status:** accepted (pipe in `main.ts`; no DTOs yet — no POST routes)

**Decision:** In `main.ts`, `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))` plus `class-validator` / `class-transformer` on DTOs (e.g. `CreateDeviceDto`).

**Why:** Matches the stack line “DTO validation.” Bad JSON must `400` rather than writing junk into Postgres. `whitelist` strips unknown fields; `forbidNonWhitelisted` rejects extras; `transform` enables type coercion.

**Tradeoff:** Stricter API; clients must send the documented shape. That is what we want for a portfolio API.

**Progress (2026-11-06):** `CreateDeviceDto` is used on `POST /devices` (trim `name`, required `name`/`type`).

---

## D010 — `/health` via `@nestjs/terminus`, Postgres first, Redis later

- **Date:** 2026-11-04
- **Status:** accepted (package installed; `HealthModule` not in `src/` yet)

**Decision:** Dedicated health module/controller at `GET /health`. Check Postgres (Terminus `PrismaHealthIndicator` if the versions fit; otherwise `SELECT 1` via Prisma). Do **not** use `/` or `/devices` as the probe.

**Why:** Load balancers (later AWS ALB) need a cheap liveness/readiness URL that does not depend on business data. Redis is already in Compose but not in the Nest process yet, so a Redis probe would be a lie or a new client — defer.

**Tradeoff:** Health will say “up” even if Redis is down, until Redis is integrated.

**Progress (2026-11-06):** `GET /health` uses Terminus `PrismaHealthIndicator.pingCheck`. Redis still not probed.

---

## D011 — First vertical slice: Device create/list, then readings; users/auth after data plane

- **Date:** 2026-11-04
- **Status:** accepted

**Decision:** First table and routes are **devices** (`POST /devices`, `GET /devices`). Next slice is **Reading belongs to Device** (store a telemetry row). Users, auth, anomalies, caching, CI, LangGraph, and AWS wait until create-device + store-reading works.

**Why:** A device without a reading is still a skeleton. A reading without a device has nothing to hang on. Auth in front of empty tables delays the “I stored energy data” proof. Anomalies need readings. The assistant needs real tools (those APIs).

**Tradeoff:** The API is briefly unauthenticated. Acceptable on localhost; must not ship that way.

**Progress (2026-11-06):** `POST /devices` and `GET /devices` work. Device **name** is unique (D013). Readings still next.

---

## D012 — Living docs: `FLOW.md` (actual code only) and `COMMANDS.md` (verified commands)

- **Date:** 2026-11-05 (`FLOW.md`); 2026-11-06 (`COMMANDS.md`)
- **Status:** accepted

**Context:** First full project; chat rationale will not stay in memory. Need a map of execution and a command cheat sheet without documenting the future as if it already runs.

**Decision:**

- **`FLOW.md`:** entry point, startup order, and request call chains for files that exist in `src/` (and real test entrypoints). Do not describe Prisma/devices/health routes until those files exist. Append when we add modules.
- **`COMMANDS.md`:** exact CLI / npm / Docker / Prisma / Git commands that belong to the current stack, with what / when / why. Mark deprecated commands. Do not list AWS, LangGraph, TypeORM, or Azure until adopted.

**Why:** FLOW is how to read the running app. COMMANDS is how to operate it. Mixing “planned” flow into FLOW would teach a system that is not there.

**Tradeoff:** Two extra files to update on every meaningful change. Accepted so learning and interviews stay accurate.

---

## D013 — Device `name` is unique in Postgres; duplicate POST → 409

- **Date:** 2026-11-06
- **Status:** accepted

**Context:** `id` is a UUID, so two rows could share the same `name` (`Inverter-01`) and confuse operators. Nest `@unique` in `schema.prisma` is not enough until a migration applies the index. Duplicate rows already in the table blocked the first apply.

**Decision:**

- `Device.name` is `@unique` in Prisma. Migration `20261106123000_unique_device_name` creates unique index `Device_name_key`.
- `POST /devices` trims `name`, then `prisma.device.create`. Prisma `P2002` → `ConflictException` (HTTP **409**), not a 500.
- Uniqueness is **case-sensitive** after trim (`Inverter-01` and `inverter-01` are different).
- Existing duplicate `Inverter-01` rows were reduced to one (oldest kept) so the index could be created. That was a one-time data fix, not an API.

**Why database unique, not only a Nest `findFirst`:** two concurrent POSTs can both pass a pre-check. Postgres is the source of truth.

**Tradeoff:** A second device cannot reuse a retired name until we add a soft-delete/rename story. Accepted for operator clarity.

**Alternatives:** Unique on `(name, site)` later if we add sites; case-insensitive unique (`LOWER(name)`) if mixed-case duplicates become a problem.

---

## D014 — Postman Collection v3 YAML in the repo, folders by domain

- **Date:** 2026-11-13
- **Status:** accepted

**Context:** Two untitled `Hello World` requests lived in `postman/collections/GridMind Bootstrap/`. Devices, health, and later domains had no collection. Agents would otherwise forget to document new routes.

**Decision:**

- One collection: `postman/collections/GridMind API/` (schema v3: directory + `*.request.yaml`).
- Folders numbered by domain (`01 Bootstrap`, `02 Health`, `03 Devices`).
- `postman/environments/Local.environment.yaml` holds `baseUrl`.
- New/changed Nest routes update the collection in the same turn (Cursor rule `postman-collection.mdc`).

**Why:** Diffs are one file per request; Local View already watches `postman/`. A single JSON collection is harder to review and easier to drift from `src/`.

**Tradeoff:** Newman cannot run v3; Postman CLI would be needed for CI later. Local Send from the app is enough now.

**Alternatives:** One `collection.json` (v2.1) for Newman; OpenAPI as the source of truth (deferred until the API is larger).

---

## Explicitly not decided yet (do not pretend otherwise)

These are on the target stack or were discussed, but **no implementation choice is locked** beyond “later”:

- Auth mechanism (JWT vs sessions vs API keys)
- Users table and roles
- Telemetry / readings schema details (columns, time-series vs row-per-reading)
- Anomaly detection: rules vs ML vs LLM
- Redis client library and cache keys
- Vector store for RAG
- Which LLM API / LangGraph graph shape
- Prisma vs other for embeddings
- GitHub Actions workflow contents / scanners
- ECS vs other AWS compute; Dockerfile layout
- Whether to remove or keep `@nestjs/observe` in production
- Replacing the default Nest README with a project README

---

## Index

| ID | Decision |
|---|---|
| D001 | Full stack as target; build in layers |
| D002 | Node 24 LTS (not 26) |
| D003 | NestJS on Node (not Functions, not Express-from-scratch) |
| D004 | CJS + Jest (not ESM + Vitest); Observe left enabled |
| D005 | Compose: Postgres 16 + Redis 7; Aurora later |
| D006 | Do not host on Azure Functions |
| D007 | Prisma 6 + migrate; Device first |
| D008 | Nest ConfigModule |
| D009 | Global ValidationPipe |
| D010 | `/health` + Terminus; Redis probe later |
| D011 | Devices then readings; auth/AWS/AI after |
| D012 | FLOW.md (actual-only) and COMMANDS.md |
| D013 | Unique device `name`; POST duplicate → 409 |
| D014 | Postman Collection v3 YAML; folders by domain |
