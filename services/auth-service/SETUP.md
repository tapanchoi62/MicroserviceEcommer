# Auth Service — Setup Guide

## 🚀 Quick Start

### Local Development
```bash
# 1. Copy .env.example to .env
cp .env.example .env

# 2. Start infrastructure (PostgreSQL, Redis, etc.)
docker-compose -f ../../../docker-compose.infra.yml up -d

# 3. Install dependencies
npm install

# 4. Generate Prisma client
npm run prisma:generate

# 5. Apply migrations
npm run prisma:migrate

# 6. Seed database with initial data
npm run prisma:seed

# 7. Start dev server
npm run start:dev
```

### Docker (Recommended for testing)
```bash
# Build and start with auto-migrations + auto-seeding
docker-compose up -d

# Check logs
docker logs auth-service

# API available at http://localhost:3001
```

---

## 🔐 Environment Configuration

### Local Development (.env)

The `.env` file is **NOT** committed to git (see `.gitignore`). It contains:
- Database credentials
- Redis configuration
- JWT secrets
- OAuth credentials (empty by default)

**Setup steps:**
```bash
# 1. Copy template
cp .env.example .env

# 2. Edit .env and fill in sensitive values
# vim .env
```

### Docker with Credentials

For Docker, credentials can be set two ways:

#### Option A: docker-compose.override.yml (Recommended)
```bash
# 1. Copy the example file
cp docker-compose.override.example.yml docker-compose.override.yml

# 2. Edit and add your credentials
# vim docker-compose.override.yml

# 3. Start Docker (it will auto-merge overrides)
docker-compose up -d
```

#### Option B: Environment Variables
```bash
# Pass credentials when running docker-compose
export GITHUB_CLIENT_ID=your_id
export GITHUB_CLIENT_SECRET=your_secret

docker-compose up -d
```

---

## 🔑 OAuth Setup

### GitHub OAuth
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Auth Service (local)
   - **Homepage URL**: http://localhost:3001
   - **Authorization callback URL**: http://localhost:3001/api/v1/auth/github/callback
4. Copy Client ID and Client Secret
5. Add to `.env` or `docker-compose.override.yml`:
   ```env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

### Google OAuth
1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable OAuth 2.0 in APIs
4. Create OAuth 2.0 credentials (Web Application)
5. Add authorized redirect URI: `http://localhost:3001/api/v1/auth/google/callback`
6. Copy Client ID and Secret
7. Add to `.env` or `docker-compose.override.yml`:
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

---

## 📁 File Structure

```
.
├── .env                              ❌ NOT committed (contains secrets)
├── .env.example                      ✅ Committed (template)
├── docker-compose.yml                ✅ Committed (base config)
├── docker-compose.override.yml       ❌ NOT committed (secret overrides)
├── docker-compose.override.example.yml ✅ Committed (example)
├── .gitignore                        ✅ Protects .env files
├── Dockerfile                        ✅ Multi-stage build
├── entrypoint.sh                     ✅ Runs migrations + seeding
└── SETUP.md                          ✅ This file
```

---

## 🗄️ Database

### Local Development
- **Host**: localhost:5432
- **Database**: auth_db
- **User/Pass**: postgres/postgres

### Docker
- **Host**: host.docker.internal:5432 (auto-configured)
- Same credentials as above

### Migrations
```bash
# Apply pending migrations
npm run prisma:migrate

# Create new migration after schema change
npm run prisma:migrate dev --name feature_name

# Prisma Studio (GUI for database)
npm run prisma:studio
```

---

## 🌱 Database Seeding

### Local Development
```bash
# Seed initial data (roles, permissions, admin user)
npm run prisma:seed
```

### Docker
Seeding runs automatically on container startup via `entrypoint.sh`:
1. Waits for database
2. Applies migrations
3. **Runs seed script**
4. Starts NestJS app

### Default Admin User
After seeding:
- **Email**: admin@echoshop.local
- **Password**: Admin@123456
- **Role**: SUPER_ADMIN

Override via environment variables:
```bash
SEED_ADMIN_EMAIL=my@email.com
SEED_ADMIN_PASSWORD=MyPassword123
```

---

## ✅ Verification

### Test API is Working
```bash
# Health check
curl http://localhost:3001/api/v1/auth/health

# Login test
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@echoshop.local",
    "password": "Admin@123456"
  }'

# Swagger API docs
open http://localhost:3001/api/docs
```

---

## 🐛 Troubleshooting

### Docker: "Port already in use"
```bash
# Find what's using the port
lsof -i :3001

# Use a different port in docker-compose.yml
ports:
  - "3002:3001"
```

### Migrations not applying
```bash
# Clear and re-apply
npm run prisma:migrate reset

# Or manually deploy
npx prisma migrate deploy
```

### Seeding fails
```bash
# Check if data already seeded
npx prisma studio

# Re-run seed (idempotent, uses upsert)
npm run prisma:seed
```

---

## 📝 Security Notes

1. **Never commit `.env`** — it contains secrets
2. **Use `.env.example`** — as a template for new developers
3. **Use `docker-compose.override.yml`** — for production credentials
4. **Rotate secrets** — change JWT secrets and passwords regularly
5. **Change default admin password** — immediately after first login

---

## 🔄 Workflow

### Adding a New Feature
```bash
# 1. Update Prisma schema
vim prisma/schema.prisma

# 2. Generate Prisma client
npm run prisma:generate

# 3. Create migration
npm run prisma:migrate dev --name feature_name

# 4. Update seed.ts if new seed data needed
vim prisma/seed.ts

# 5. Test locally
npm run start:dev
```

### Deploying to Docker
```bash
# 1. Ensure all migrations are committed
git add prisma/migrations/

# 2. Create docker-compose.override.yml with credentials
cp docker-compose.override.example.yml docker-compose.override.yml
# Edit with actual secrets

# 3. Build and start
docker-compose build
docker-compose up -d

# 4. Check logs
docker logs auth-service
```

---

## 📚 Related Docs

- [Prisma Documentation](https://www.prisma.io/docs/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
