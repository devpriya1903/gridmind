# GridMind — code execution flow

How control actually moves between **files that exist today**. Append when we add modules. Do **not** describe routes or services that are not in `src/` yet.

Last updated: 2026-11-18 (`evaluate` after `reading.create`).

---

## Files that participate in a running API

| File | Role |
|---|---|
| `package.json` | Scripts that start Node (`start:dev`, `start`) |
| `src/main.ts` | **Process entry point** — ValidationPipe, then listen |
| `src/app.module.ts` | Root module — Config, Observe, Prisma, Devices, Readings, Health, Anomalies |
| `src/app.controller.ts` / `src/app.service.ts` | `GET /` and `GET /test` |
| `src/prisma/prisma.module.ts` | Global module exporting `PrismaService` |
| `src/prisma/prisma.service.ts` | Prisma client; `$connect` on module init |
| `src/devices/devices.module.ts` | Registers devices controller + service |
| `src/devices/devices.controller.ts` | `POST /devices`, `GET /devices`, `GET /devices/:id` |
| `src/devices/dto/create-device.dto.ts` | Validates/trims POST body |
| `src/devices/devices.service.ts` | Prisma create/list/findById; 409 unique name; 404 missing id |
| `src/readings/readings.module.ts` | Readings + **imports `AnomaliesModule`** so `AnomaliesService` can be injected |
| `src/readings/readings.controller.ts` | `POST/GET /devices/:deviceId/readings` |
| `src/readings/dto/create-reading.dto.ts` | Validates metric, value, optional recordedAt |
| `src/readings/readings.service.ts` | Create/list readings; after create, `anomaliesService.evaluate(reading)` |
| `src/anomalies/anomalies.module.ts` | Registers anomalies controller + service |
| `src/anomalies/anomalies.controller.ts` | `GET /devices/:deviceId/anomalies` |
| `src/anomalies/anomalies.service.ts` | `evaluate` (power_kw thresholds); list by device |
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
        │  AnomaliesModule → AnomaliesService, AnomaliesController
        │  ReadingsModule (imports AnomaliesModule) → ReadingsService, ReadingsController
        │  HealthModule → HealthController
        │  AppController / AppService
        ▼
  bootstrap()
        ├─ NestFactory.create(AppModule, { instrument: ObserveInstrument })
        ├─ app.useGlobalPipes(ValidationPipe)   whitelist, forbidNonWhitelisted, transform
        └─ app.listen(process.env.PORT ?? 3000)
```

**Who constructs whom:** Nest instantiates `PrismaService` once (global). `DevicesService`, `ReadingsService`, and `HealthController` receive that same instance.

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

## Request: `GET /devices/:id`

Declared **after** `GET /devices` so Nest does not treat `"devices"` as an id. `ParseUUIDPipe` on `:id` → invalid uuid **400**.

```
HTTP GET /devices/:id
        │
        ▼
  ParseUUIDPipe
        ▼
  DevicesController.findById(id)
        ▼
  DevicesService.findById
        ├─ prisma.device.findUnique({ where: { id } })
        │     missing → NotFoundException → HTTP 404
        │               "Device {id} not found"
        └─ found → 200 JSON of that Device row
```

Does **not** include readings. Those stay on `GET /devices/:deviceId/readings`.

---

## Request: `POST /devices/:deviceId/readings`

`ParseUUIDPipe` runs on `:deviceId` before the method. Invalid UUID → **400**.

```
HTTP POST /devices/:deviceId/readings  JSON body
        │
        ▼
  ParseUUIDPipe + ValidationPipe (CreateReadingDto)
        │  extra JSON → 400; missing metric/value → 400
        ▼
  ReadingsController.create(deviceId, dto)
        │
        ▼
  ReadingsService.create
        ├─ prisma.device.findUnique
        │     missing → NotFoundException → HTTP 404
        ├─ prisma.reading.create(...)  → Reading row
        ├─ anomaliesService.evaluate(reading)
        │     not power_kw or value ≤ 50 → no Anomaly
        │     power_kw > 50 → warning; > 100 → critical → prisma.anomaly.create
        └─ return the Reading (201). The anomaly is a side effect, not the response.
```

A reading cannot exist without a device: Postgres `Reading_deviceId_fkey` (`ON DELETE CASCADE`). An anomaly cannot exist without a reading: `Anomaly_readingId_fkey`.

---

## Request: `GET /devices/:deviceId/readings`

```
HTTP GET /devices/:deviceId/readings
  → ReadingsController.findAll
  → ReadingsService.findAllForDevice
        ├─ device missing → 404
        └─ prisma.reading.findMany({ where: { deviceId }, orderBy: recordedAt desc })
```

---

## Request: `GET /devices/:deviceId/anomalies`

```
HTTP GET /devices/:deviceId/anomalies
        │
        ▼
  ParseUUIDPipe
        ▼
  AnomaliesController.findAllForDevice
        ▼
  AnomaliesService.findAllForDevice
        ├─ prisma.device.findUnique → missing → 404
        └─ prisma.anomaly.findMany({ where: { reading: { deviceId } }, orderBy: createdAt desc })
```

This list is filled only because `POST .../readings` already ran `evaluate`. A `power_kw` of `12.5` still yields `[]`; `80` yields a `warning`; `120` yields `critical`.

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
| `DevicesController.findById` | `src/devices/devices.controller.ts` | `GET /devices/:id` | `DevicesService.findById` |
| `DevicesService.findById` | `src/devices/devices.service.ts` | controller | `device.findUnique`; missing → `NotFoundException` |
| `ReadingsController.create` | `src/readings/readings.controller.ts` | `POST /devices/:deviceId/readings` | `ReadingsService.create` |
| `ReadingsService.create` | `src/readings/readings.service.ts` | controller | `device.findUnique`; `reading.create`; `anomaliesService.evaluate` |
| `ReadingsController.findAll` | `src/readings/readings.controller.ts` | `GET /devices/:deviceId/readings` | `ReadingsService.findAllForDevice` |
| `ReadingsService.findAllForDevice` | `src/readings/readings.service.ts` | controller | `device.findUnique`; then `reading.findMany` |
| `AnomaliesController.findAllForDevice` | `src/anomalies/anomalies.controller.ts` | `GET /devices/:deviceId/anomalies` | `AnomaliesService.findAllForDevice` |
| `AnomaliesService.findAllForDevice` | `src/anomalies/anomalies.service.ts` | controller | `device.findUnique`; then `anomaly.findMany` via reading.deviceId |
| `AnomaliesService.evaluate` | `src/anomalies/anomalies.service.ts` | `ReadingsService.create` | `anomaly.create` if `power_kw` exceeds 50/100; else `null` |
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
- Auth
- `ConfigService` injection (ConfigModule is loaded; most code still uses `process.env` for Observe/PORT)

---

## How this file will grow

When we add a module, append files, startup changes, and the request call chain.
