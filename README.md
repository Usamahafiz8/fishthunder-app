# FishThunder Platform — Milestone 1

Stack: **NestJS** (Node 20, TypeScript) · **Next.js 14** · **PostgreSQL 15** · **Redis 7** · **JWT**

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ running locally (or Docker)
- Redis running locally (or Docker)

---

## Backend (NestJS)

```bash
cd backend
cp .env.example .env          # fill in DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET
npm install

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Paste the output into JWT_SECRET in your .env

# Run migrations (creates all tables)
npm run migration:run

# Seed database (creates one user per role + sample transactions)
npm run seed

# Start dev server (http://localhost:3001)
npm run start:dev
```
