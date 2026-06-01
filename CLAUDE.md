# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

E-commerce platform built as **NestJS microservices**. Each service is fully independent with its own database, Docker Compose, and `.env`. The monorepo lives under `services/` — there is no shared library or workspace tooling; each service is a standalone Node.js project.

---

## Commands (per service — run inside `services/<name>/`)

```bash
# Dev (watch mode, no build needed)
npm run start:dev

# One-shot start (builds first, then runs dist/main.js)
npm run start

# Build only
npm run build

# Production
npm run start:prod   # node dist/main.js directly

# Prisma
npm run prisma:generate   # regenerate Prisma client after schema change
npm run prisma:migrate    # apply migrations (creates tables)
npm run prisma:seed       # seed default roles/permissions
npm run prisma:studio     # open Prisma Studio GUI

# Tests
npm run test              # all unit tests
npm run test:watch        # watch mode
npm run test:cov          # coverage
npm run test:e2e          # e2e (requires jest-e2e.json)

# Lint / format
npm run lint
npm run format
```

### Known build gotcha — stale incremental cache

`nest-cli.json` sets `"deleteOutDir": true`, so every `nest start` wipes `dist/`. The `.tsbuildinfo` is stored **inside** `dist/` (`"tsBuildInfoFile": "./dist/.tsbuildinfo"` in `tsconfig.json`) so it gets cleaned automatically. If you manually delete `dist/` without removing a root-level `tsconfig.build.tsbuildinfo`, TypeScript will think everything is up-to-date and emit nothing. Fix: delete the stale `.tsbuildinfo` then rebuild.

---

## Infrastructure

### Start all shared infra (databases, Redis, Kafka, Elasticsearch, pgAdmin, etc.)

```bash
docker-compose -f docker-compose.infra.yml up -d
```

### Start a single service's infra only

```bash
docker-compose -f services/auth/auth-service/docker-compose.yml up -d
```

Each service has its own `docker-compose.yml` that spins up its private PostgreSQL + Redis.

---

## Port Map (local dev)

| Layer | Service | HTTP | gRPC |
|---|---|---|---|
| Frontend | Next.js | 3000 | — |
| Gateway | API Gateway | 3100 | — |
| Service | Auth | 3001 | 50051 |
| Service | Product | 3002 | 50052 |
| Service | Order | 3003 | 50053 |
| Service | Inventory | 3004 | 50054 |
| Service | Payment | 3005 | 50055 |
| Service | Cart | 3006 | 50056 |
| Service | Search | 3007 | 50057 |
| Service | Notification | 3008 | 50058 |
| Infra | Redis | 6379 | — |
| Infra | Kafka (external) | 29092 | — |
| Infra | Elasticsearch | 9200 | — |
| Dev tool | pgAdmin | 5050 | — |
| Dev tool | Kafka UI | 8080 | — |
| Dev tool | Redis Insight | 8001 | — |

Each PostgreSQL runs on its own port: auth=5432, product=5433, order=5434, inventory=5435, payment=5436, notification=5437, shipping=5438.

Redis is shared, services separate by DB index: auth=0, cart=1, product=2, order=3, session=4.

Swagger docs for every service: `http://localhost:<port>/api/docs`

---

## Architecture

### Communication patterns

- **REST** — client-facing APIs through API Gateway
- **gRPC** — internal synchronous service-to-service calls
- **Kafka** — async event bus (topics like `user.created`, `user.logged_in`, `order.placed`, etc.)

### Design patterns in use

- Saga (distributed transactions across services)
- CQRS (read/write separation)
- Outbox Pattern (reliable event publishing)
- Circuit Breaker (fault isolation)

---

## Auth Service (`services/auth/auth-service/`)

The only service currently implemented. Reference implementation for all other services.

### Module structure

```
src/
  auth/
    controllers/   ← AuthController (all /api/v1/auth/* routes)
    services/      ← AuthService, MfaService
    dto/           ← RegisterDto, LoginDto, RefreshTokenDto, VerifyMfaDto
    guards/        ← JwtAuthGuard (global), RolesGuard (global)
    strategies/    ← jwt.strategy.ts, refresh-jwt.strategy.ts
    decorators/    ← @CurrentUser(), @Roles(), @Public()
    interfaces/    ← JwtPayload, AuthResponse
  users/           ← UsersService, UsersModule
  roles/           ← RolesService, RolesModule
  common/
    prisma/        ← PrismaService (singleton DB client)
    redis/         ← RedisService (ioredis wrapper)
  config/
    configuration.ts  ← typed config factory (all env vars mapped here)
  app.module.ts    ← JwtAuthGuard + RolesGuard applied globally via APP_GUARD
  main.ts
```

### JWT flow

- **Access token**: 15m, signed with `JWT_ACCESS_SECRET`, carries `{ sub, email, roles, jti }`
- **Refresh token**: 7d, signed with `JWT_REFRESH_SECRET`, stored as bcrypt hash in `refresh_tokens` table, rotated on every refresh call
- On logout: access token JTI is blacklisted in Redis (`blacklist:{jti}` key), all refresh tokens for the user are revoked in DB

### Global guards

`JwtAuthGuard` and `RolesGuard` are registered globally in `AppModule`. To make an endpoint public, use `@Public()` decorator — it sets a `isPublic` metadata flag that `JwtAuthGuard` checks before verifying the token.

### Redis key schema (auth service, DB 0)

```
blacklist:{jwtId}       → "1"  (TTL = remaining access token lifetime)
mfa:{userId}            → OTP string  (TTL 300s)
oauth:state:{state}     → JSON  (TTL 600s)
```

### OAuth

- Google: disabled if `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are empty (logs a WARN, does not crash)
- GitHub: enabled when credentials are set in `.env`
- Callback URLs are set per provider in `.env` and must match the OAuth app settings

### Prisma schema key points

- `users.provider` distinguishes `"local"` vs `"google"` vs `"github"` accounts
- `users.passwordHash` is nullable — OAuth users have no password
- `UserRole` is a join table; new users always get the `CUSTOMER` role on register
- Sessions are tracked per device (IP + User-Agent); `GET /api/v1/auth/sessions` lists all, `DELETE /api/v1/auth/sessions/:id` revokes one

### Config access pattern

All env vars are loaded through `src/config/configuration.ts` and accessed via `ConfigService.get('nested.key')` — never `process.env` directly in services. Key config paths: `port`, `jwt.accessSecret`, `jwt.refreshSecret`, `jwt.accessExpires`, `jwt.refreshExpires`, `redis.host`, `redis.port`, `cors.allowedOrigins`, `oauth.google.*`, `oauth.github.*`.

---

### Role management endpoints

| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| `GET` | `/api/v1/roles` | ADMIN, SUPER_ADMIN | List all roles + permissions |
| `GET` | `/api/v1/roles/:id` | ADMIN, SUPER_ADMIN | Get role detail by ID |
| `POST` | `/api/v1/roles` | SUPER_ADMIN | Create custom role |
| `GET` | `/api/v1/users/members` | ADMIN, SUPER_ADMIN | **List members** with roles (filtered by caller's level) |
| `POST` | `/api/v1/users/:id/roles` | ADMIN, SUPER_ADMIN | **Add** a single role to user |
| `PATCH` | `/api/v1/users/:id/roles` | ADMIN, SUPER_ADMIN | **Update roles** — hierarchy-aware (ADMIN limited to STAFF/CUSTOMER) |
| `PUT` | `/api/v1/users/:id/roles` | SUPER_ADMIN | **Replace ALL roles** of a user (unrestricted) |
| `DELETE` | `/api/v1/users/:id/roles/:role` | SUPER_ADMIN | Remove a single role from user |

---

### Privilege hierarchy

```
SUPER_ADMIN (3) > ADMIN (2) > STAFF (1) > CUSTOMER (0)
```

Each caller can only manage users **below** their own level and assign roles **below** their own level.

---

#### List members — `GET /api/v1/users/members`

Returns a paginated list of users with their full role list.

| Caller role | Users visible |
|-------------|--------------|
| ADMIN | Users whose highest role is STAFF or CUSTOMER |
| SUPER_ADMIN | All users |

**Query params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | number | no (default 1) | Page number |
| `limit` | number | no (default 20, max 100) | Items per page |
| `role` | string | no | Filter by exact role name (`STAFF`, `CUSTOMER`, …) |
| `search` | string | no | Partial match on `fullName` or `email` (case-insensitive) |

---

#### Update member roles — `PATCH /api/v1/users/:id/roles`

Hierarchy-aware role replacement. Both ADMIN and SUPER_ADMIN can call this; the service enforces privilege rules.

**Request body:**
```json
{ "roles": ["STAFF"] }
```

**ADMIN rules:**
- Cannot edit own account.
- Target user's highest role must be **below** ADMIN (i.e. STAFF or CUSTOMER).
- Can only assign `STAFF` or `CUSTOMER` — assigning `ADMIN`/`SUPER_ADMIN` → `403`.

**SUPER_ADMIN rules:**
- Cannot edit own account via this endpoint (use `PUT /users/:id/roles`).
- Can assign any roles.
- Last-SUPER_ADMIN guard still applies.

**Error responses:**

| Status | Meaning |
|--------|---------|
| 403 | Own-account edit, or insufficient privilege over target |
| 404 | Target user or one of the roles not found |
| 409 | Removing last SUPER_ADMIN from the system |

---

#### Change roles (full replace) — `PUT /api/v1/users/:id/roles` (SUPER_ADMIN only)

Atomically replaces **all** existing roles of a user. No hierarchy restriction — SUPER_ADMIN can assign any roles including promoting to SUPER_ADMIN. Last-SUPER_ADMIN guard applies.

**Request body:**
```json
{ "roles": ["ADMIN", "STAFF"] }
```

---

#### Files added / changed (role management)

| File | Purpose |
|------|---------|
| `src/users/dto/change-roles.dto.ts` | `ChangeRolesDto` — array of role names (shared by PUT + PATCH) |
| `src/users/dto/members-query.dto.ts` | `MembersQueryDto` — query params for GET /members |
| `src/users/users.service.ts` | `findMembers()`, `updateMemberRoles()`, `changeRoles()` |
| `src/users/users.controller.ts` | GET /members, PATCH /:id/roles, PUT /:id/roles endpoints |
