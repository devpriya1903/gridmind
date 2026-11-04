# GridMind — code execution flow

How control actually moves between **files that exist today**. When we add modules (Prisma, devices, health), we append sections. We do **not** describe routes or services that are not in `src/` yet.

Last updated: 2026-11-05 (Nest skeleton only).

---

## Files that participate in a running API

| File | Role |
|---|---|
| `package.json` | Scripts that start Node (`start:dev`, `start`) |
| `src/main.ts` | **Process entry point** — builds the Nest app and listens on a port |
| `src/app.module.ts` | Root module — tells Nest which controllers and services exist |
| `src/app.controller.ts` | HTTP adapter — maps `GET /` to a method |
| `src/app.service.ts` | Logic for that method — returns the string |

Everything else (`test/`, `docker-compose.yml`, `.env`) is either tests or **other processes**. They are not called by `bootstrap()`.

---

## Entry point

You type:

```bash
npm run start:dev
```

That runs `nest start --watch` (see `package.json`). The Nest CLI compiles TypeScript under `src/` and starts Node on the compiled output of **`src/main.ts`**.

**The first function in our code that runs is `bootstrap` in `src/main.ts`.** The last line of that file calls it immediately:

```ts
async function bootstrap() { ... }
void bootstrap();
```

`void` means “call this async function and ignore the returned Promise.” Node stays alive because `app.listen` opens a TCP server.

Production-style start (`npm run start:prod`) is `node dist/main` — same file, already compiled to `dist/main.js`.

---

## Startup order (once, when the process boots)

```
npm run start:dev
        │
        ▼
  Nest CLI compiles src/
        │
        ▼
  Node loads src/main.ts
        │
        ▼
  import AppModule from app.module.ts
        │   (loading app.module.ts also runs createObserveModule()
        │    and exports ObserveModule + ObserveInstrument)
        ▼
  bootstrap()
        │
        ├─ NestFactory.create(AppModule, { instrument: ObserveInstrument })
        │     │
        │     ├─ Nest reads @Module() on AppModule
        │     │     imports:     ObserveModule.forRoot(...)
        │     │     controllers: AppController
        │     │     providers:   AppService
        │     │
        │     ├─ Nest constructs AppService  (no constructor args)
        │     └─ Nest constructs AppController(appService)
        │           constructor injection: AppController needs AppService,
        │           so Nest passes the instance it just created
        │
        └─ app.listen(process.env.PORT ?? 3000)
              HTTP server is up (default port 3000)
```

Until `listen` finishes, there is no HTTP API. After it finishes, the process waits for requests.

**Who constructs whom:** you never write `new AppController()`. Nest does, because `AppModule` listed the classes. That is dependency injection.

---

## Request order (every `GET /`)

Browser or `curl http://localhost:3000/` hits the process that `listen` started.

`@nestjs/platform-express` (Express under Nest) receives the HTTP request. Nest’s router looks at controllers:

- `AppController` has `@Controller()` with **no path prefix** → routes live at `/`
- `getHello` has `@Get()` with **no extra path** → this is `GET /`

```
HTTP GET /
        │
        ▼
  Express (inside Nest)
        │
        ▼
  AppController.getHello()     src/app.controller.ts
        │
        └─ return this.appService.getHello()
                    │
                    ▼
              AppService.getHello()    src/app.service.ts
                    │
                    └─ return 'Hello World!'
                              │
                              ▼
                    Nest sends HTTP 200, body: Hello World!
```

**Call chain for the only product route we have:**

1. `AppController.getHello` calls
2. `AppService.getHello`

No database, no Redis, no other modules.

---

## Function map (current `src/`)

| Function / method | File | Called by | Calls |
|---|---|---|---|
| `bootstrap` | `src/main.ts` | last line of `main.ts` (`void bootstrap()`) | `NestFactory.create`, then `app.listen` |
| `createObserveModule` | `@nestjs/observe` (used in `app.module.ts`) | when `app.module.ts` is imported | returns `ObserveModule` and `ObserveInstrument` |
| `AppController` constructor | `src/app.controller.ts` | Nest, during `NestFactory.create` | nothing (stores `appService`) |
| `AppController.getHello` | `src/app.controller.ts` | HTTP `GET /` | `AppService.getHello` |
| `AppService.getHello` | `src/app.service.ts` | `AppController.getHello` | nothing (returns a string) |

---

## What is running next to the app (not in this call graph)

`docker compose up -d` starts **Postgres** and **Redis** as separate containers. Nest does **not** import them, connect to them, or call them. They wait on ports `5432` and `6379` until we add Prisma (or a Redis client).

`.env` / `PORT` — `main.ts` reads `process.env.PORT` at listen time. There is no `ConfigModule` in `src/` yet.

---

## Tests (separate entry points — only if you run them)

These do **not** run when you `npm run start:dev`.

| Command | Entry | What it does |
|---|---|---|
| `npm test` | `src/app.controller.spec.ts` | `Test.createTestingModule` builds a fake Nest module with `AppController` + `AppService`, then calls `appController.getHello()` directly (no HTTP) |
| `npm run test:e2e` | `test/app.e2e-spec.ts` | Builds `AppModule`, `app.init()`, then Supertest `GET /` against the in-memory HTTP server |

E2E path after `app.init()` is the same as production: `GET /` → `AppController.getHello` → `AppService.getHello`.

---

## Not in the graph yet (do not learn these as current flow)

None of these files or routes exist in `src/` today. They will get their own sections when we add them:

- `ConfigModule` / `ConfigService`
- `PrismaService`, migrations, Postgres queries
- `DevicesController` / `DevicesService` / `POST /devices`
- `HealthController` / `GET /health`
- Redis

---

## How this file will grow

When we add a module, append:

1. New files and their role
2. Where they are registered (`AppModule` `imports` / `controllers` / `providers`)
3. Startup changes (e.g. `PrismaService.onModuleInit` → `$connect`)
4. Request call chain for each new route
