# GridMind — code execution flow

How control actually moves between **files that exist today**. Append when we add modules. Do **not** describe routes or services that are not in `src/` yet.

Last updated: 2026-11-06 (devices unique `name`, health, Prisma).

---

## Files that participate in a running API

| File | Role |
|---|---|
| `package.json` | Scripts that start Node (`start:dev`, `start`) |
| `src/main.ts` | **Process entry point** — ValidationPipe, then listen |
| `src/app.module.ts` | Root module — Config, Observe, Prisma, Devices, Health |
| `src/app.controller.ts` / `src/app.service.ts` | `GET /` and `GET /test` |
| `src/prisma/prisma.module.ts` | Global module exporting `PrismaService` |
| `src/prisma/prisma.service.ts` | Prisma client; `$connect` on module init |
| `src/devices/devices.module.ts` | Registers devices controller + service |
| `src/devices/devices.controller.ts` | `POST /devices`, `GET /devices` |
| `src/devices/dto/create-device.dto.ts` | Validates/trims POST body |
| `src/devices/devices.service.ts` | Prisma create/list; maps unique violations to 409 |
| `src/health/health.module.ts` | Terminus + health controller |
| `src/health/health.controller.ts` | `GET /health` pings Postgres |

`docker-compose.yml` / Postgres / Redis are **other processes**. Redis is not called from Nest yet.

---

## Entry point

```bash
npm run start:dev
```

Nest CLI compiles `src/` and Node runs **`src/main.ts`**. First function of ours: **`bootstrap`**, via `void bootstrap()`.

---

## Startup order (once)

```
npm run start:dev
        │
        ▼
  Node loads src/main.ts
        │
        ▼
  import AppModule
        │  createObserveModule()
        │  ConfigModule.forRoot (.env)
        │  PrismaModule (global) → constructs PrismaService → onModuleInit → $connect
        │  DevicesModule → DevicesService, DevicesController
        │  HealthModule → HealthController
        │  AppController / AppService
        ▼
  bootstrap()
        ├─ NestFactory.create(AppModule, { instrument: ObserveInstrument })
        ├─ app.useGlobalPipes(ValidationPipe)   whitelist, forbidNonWhitelisted, transform
        └─ app.listen(process.env.PORT ?? 3000)
```

**Who constructs whom:** Nest instantiates `PrismaService` once (global). `DevicesService` and `HealthController` receive that same instance.

---

## Request: `GET /`

```
HTTP GET /
  → AppController.getHello()
  → AppService.getHello()
  → 'Hello World!'
```

`GET /test` → `AppController.getHello2()` → `AppService.getHello2()`.

---

## Request: `POST /devices` (create)

ValidationPipe runs **before** the controller (because `transform: true` and DTO decorators).

```
HTTP POST /devices  JSON body
        │
        ▼
  ValidationPipe
        │  CreateDeviceDto: trim name, require name+type, optional status in online|offline|fault
        │  extra JSON fields → 400
        ▼
  DevicesController.create(dto)
        │
        ▼
  DevicesService.create(dto)
        │
        ├─ prisma.device.create({ data: dto })
        │        │
        │        ├─ success → 201/200 JSON of the row (new uuid id)
        │        │
        │        └─ Postgres unique on Device.name violated
        │                 Prisma error P2002
        │                 → ConflictException
        │                 → HTTP 409  { message: A device named "…" already exists }
        │
        └─ any other Prisma error is rethrown (Nest 500)
```

Uniqueness is enforced in **Postgres** (`UNIQUE` on `"Device"."name"`), not only in Nest. Two concurrent POSTs with the same name cannot both succeed.

Names are compared **exactly** after trim (`Inverter-01` ≠ `inverter-01`).

---

## Request: `GET /devices`

```
HTTP GET /devices
  → DevicesController.findAll()
  → DevicesService.findAll()
  → prisma.device.findMany({ orderBy: { createdAt: 'desc' } })
```

---

## Request: `GET /health`

```
HTTP GET /health
  → HealthController.check()
  → HealthCheckService.check([ PrismaHealthIndicator.pingCheck('postgres', prisma) ])
```

Does not check Redis.

---

## Function map (product paths)

| Function / method | File | Called by | Calls |
|---|---|---|---|
| `bootstrap` | `src/main.ts` | `void bootstrap()` | `NestFactory.create`, `useGlobalPipes`, `listen` |
| `PrismaService.onModuleInit` | `src/prisma/prisma.service.ts` | Nest after construct | `$connect` |
| `DevicesController.create` | `src/devices/devices.controller.ts` | `POST /devices` | `DevicesService.create` |
| `DevicesService.create` | `src/devices/devices.service.ts` | controller | `prisma.device.create`; on P2002 → `ConflictException` |
| `DevicesController.findAll` | `src/devices/devices.controller.ts` | `GET /devices` | `DevicesService.findAll` |
| `DevicesService.findAll` | `src/devices/devices.service.ts` | controller | `prisma.device.findMany` |
| `HealthController.check` | `src/health/health.controller.ts` | `GET /health` | Terminus `pingCheck` |

---

## Tests (only if you run them)

| Command | Entry |
|---|---|
| `npm test` | `src/app.controller.spec.ts` (Hello World unit test; does not cover devices) |
| `npm run test:e2e` | `test/app.e2e-spec.ts` (`GET /` only so far) |

---

## Not in the graph yet

- Redis client / cache
- Readings / telemetry
- Auth
- `ConfigService` injection (ConfigModule is loaded; most code still uses `process.env` for Observe/PORT)

---

## How this file will grow

When we add a module, append files, startup changes, and the request call chain.
