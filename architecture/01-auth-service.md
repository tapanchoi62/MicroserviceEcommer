# Auth Service Design

## Overview

Auth Service chịu trách nhiệm xác thực và phân quyền cho toàn bộ hệ thống microservices.

### Core Features

- User Registration
- User Login
- JWT Authentication
- Refresh Token Rotation
- RBAC Authorization
- Session Management
- OAuth2 Login
- MFA Support
- Rate Limiting

---

# Architecture

```text
Client
   |
API Gateway
   |
Auth Service (NestJS)
   |
-------------------------------------------------
| PostgreSQL | Redis | OAuth Providers |
-------------------------------------------------
```

---

# Responsibilities

## Authentication

- Register account
- Login bằng email/password
- JWT Access Token generation
- Refresh Token generation
- Token validation
- Logout
- Session tracking

## Authorization

- RBAC (Role Based Access Control)
- Permission validation
- Guard + Decorator integration

## Security

- Password hashing
- Refresh token rotation
- Session invalidation
- MFA support
- OAuth2 login
- Rate limiting
- IP tracking
- Device tracking

---

# Tech Stack

| Component      | Technology       |
| -------------- | ---------------- |
| Framework      | NestJS           |
| Database       | PostgreSQL       |
| Cache          | Redis            |
| ORM            | Prisma / TypeORM |
| Authentication | JWT              |
| OAuth          | Google / GitHub  |
| Hashing        | bcrypt           |
| Validation     | class-validator  |
| Queue          | BullMQ           |
| Config         | @nestjs/config   |
| Logging        | Winston / Pino   |

---

# Database Design

## users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,
    full_name VARCHAR(255),
    avatar_url TEXT,
    provider VARCHAR(50) DEFAULT 'local',
    provider_id VARCHAR(255),
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_mfa_enabled BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## roles

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## permissions

```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## user_roles

```sql
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY(user_id, role_id)
);
```

---

## role_permissions

```sql
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY(role_id, permission_id)
);
```

---

## refresh_tokens

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## sessions

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_info TEXT,
    ip_address VARCHAR(100),
    user_agent TEXT,
    last_activity TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# Redis Usage

## Store

- JWT blacklist
- Session cache
- OTP/MFA codes
- Rate limiting counters
- OAuth state
- Temporary tokens

## Example Keys

```text
session:{sessionId}
refresh:{userId}
rate_limit:{ip}
mfa:{userId}
blacklist:{jwtId}
```

---

# API Design

# Auth APIs

## Register

```http
POST /auth/register
```

### Request

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123",
  "fullName": "John Doe"
}
```

### Response

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "accessToken": "jwt",
  "refreshToken": "jwt"
}
```

---

## Login

```http
POST /auth/login
```

### Request

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123"
}
```

### Response

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt"
}
```

---

## Refresh Token

```http
POST /auth/refresh
```

### Request

```json
{
  "refreshToken": "jwt"
}
```

### Response

```json
{
  "accessToken": "new-jwt",
  "refreshToken": "new-refresh-token"
}
```

---

## Logout

```http
POST /auth/logout
```

---

## Get Profile

```http
GET /auth/profile
```

---

# JWT Strategy

## Access Token

- Short lifetime (15m)
- Stored client-side
- Used for API authentication

## Refresh Token

- Long lifetime (7d–30d)
- Stored securely
- Rotated every refresh
- Revoked on logout

---

# RBAC Authorization

## Roles

Example:

- SUPER_ADMIN
- ADMIN
- STAFF
- CUSTOMER

## Permissions

Example:

- product.create
- product.update
- product.delete
- order.read
- order.update

---

# NestJS Module Structure

```text
src/
 ├── auth/
 │    ├── controllers/
 │    ├── services/
 │    ├── dto/
 │    ├── guards/
 │    ├── strategies/
 │    ├── decorators/
 │    ├── interfaces/
 │    ├── entities/
 │    └── auth.module.ts
 │
 ├── users/
 ├── roles/
 ├── permissions/
 ├── common/
 ├── config/
 └── main.ts
```

---

# Guards

## JWT Guard

```ts
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
```

## Roles Guard

```ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
```

---

# Security Best Practices

## Password Hashing

```ts
bcrypt.hash(password, 12);
```

## Rate Limiting

```ts
ThrottlerModule.forRoot([
  {
    ttl: 60,
    limit: 10,
  },
]);
```

## Helmet

```ts
app.use(helmet());
```

## CORS

```ts
app.enableCors({
  origin: ["http://localhost:3000"],
  credentials: true,
});
```

---

# OAuth2 Flow

## Supported Providers

- Google
- GitHub
- Facebook

## Flow

```text
Client
   |
/auth/google
   |
Google OAuth
   |
Callback
   |
Generate JWT
```

---

# MFA Flow

## Supported Methods

- Email OTP
- TOTP (Google Authenticator)

## Flow

```text
Login
  |
Password Verified
  |
MFA Challenge
  |
OTP Verification
  |
JWT Issued
```

---

# Session Management

## Features

- Multi-device login
- Session revoke
- Track device/IP
- Active session list

---

# Docker Setup

## docker-compose.yml

```yaml
version: "3.9"

services:
  auth-service:
    build: .
    ports:
      - "3001:3001"
    env_file:
      - .env
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: auth_db
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"
```

---

# Environment Variables

```env
PORT=3001

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth_db

JWT_ACCESS_SECRET=access_secret
JWT_REFRESH_SECRET=refresh_secret

JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

REDIS_HOST=localhost
REDIS_PORT=6379
```

---

# CI/CD Suggestions

## Pipeline

```text
Lint
  ↓
Test
  ↓
Build
  ↓
Docker Build
  ↓
Push Registry
  ↓
Deploy VPS/Kubernetes
```

---

# Future Improvements

- SSO Integration
- Audit Logging
- WebAuthn / Passkeys
- Device fingerprinting
- Advanced anomaly detection
- Account lockout policy
- Email verification workflow
- Password reset workflow

---

# Recommended Packages

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt ioredis class-validator class-transformer @nestjs/throttler helmet
```

---

# Suggested Microservice Communication

## Communication Methods

- REST
- gRPC
- RabbitMQ
- Kafka

## Example Events

```text
user.created
user.logged_in
user.logged_out
user.role_updated
```

---

# Production Recommendations

## Infrastructure

- Deploy with Docker
- Use Kubernetes for scaling
- Enable HTTPS
- Use reverse proxy (Nginx)
- Use centralized logging
- Use monitoring (Prometheus + Grafana)

## Monitoring

- Health checks
- Metrics
- Distributed tracing
- Error tracking

---

# Example Health Endpoint

```http
GET /health
```

### Response

```json
{
  "status": "ok"
}
```
