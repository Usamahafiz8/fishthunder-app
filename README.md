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

### Required Environment Variables

| Variable                     | Description                                      |
|------------------------------|--------------------------------------------------|
| `NODE_ENV`                   | `development` / `staging` / `production`        |
| `PORT`                       | API port (default: 3001)                        |
| `FRONTEND_URL`               | Next.js URL (for CORS + email links)            |
| `DB_HOST`                    | PostgreSQL host                                  |
| `DB_PORT`                    | PostgreSQL port (default: 5432)                 |
| `DB_NAME`                    | Database name                                    |
| `DB_USER`                    | Database username                               |
| `DB_PASSWORD`                | Database password                               |
| `DB_SSL`                     | `true` / `false`                                |
| `JWT_SECRET`                 | 64-byte random hex string                       |
| `JWT_EXPIRES_IN`             | Token TTL e.g. `1h`, `2h`                      |
| `REDIS_HOST`                 | Redis host                                      |
| `REDIS_PORT`                 | Redis port                                      |
| `REDIS_PASSWORD`             | Redis password (optional)                       |
| `AUTH_RATE_LIMIT_TTL`        | Rate limit window in seconds (default: 60)      |
| `AUTH_RATE_LIMIT_MAX`        | Max requests per window (default: 10)           |
| `PASSWORD_RESET_EXPIRY_MINUTES` | Password reset token lifetime (default: 60)  |
| `MAIL_HOST`                  | SMTP host                                       |
| `MAIL_PORT`                  | SMTP port                                       |
| `MAIL_USER`                  | SMTP username                                   |
| `MAIL_PASS`                  | SMTP password                                   |
| `MAIL_FROM`                  | From email address                              |
| `BCRYPT_ROUNDS`              | Bcrypt cost factor (default: 12)                |

### Seeded Credentials

| Role        | Username      | Email                        | Password      |
|-------------|---------------|------------------------------|---------------|
| Admin       | admin         | admin@fishthunder.com        | Admin@1234    |
| Agent       | agent1        | agent@fishthunder.com        | Agent@1234    |
| Distributor | distributor1  | dist@fishthunder.com         | Dist@1234     |
| Manager     | manager1      | manager@fishthunder.com      | Manager@1234  |
| Cashier     | cashier1      | cashier@fishthunder.com      | Cashier@1234  |
| Player      | player1       | player@fishthunder.com       | Player@1234   |

---

## Frontend (Next.js)

```bash
cd frontend
cp .env.example .env.local     # set NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev                     # http://localhost:3000
```

---

## API Endpoints

All responses follow: `{ success, data, error, message }`

### Auth (public, rate-limited 10 req/min)
| Method | Endpoint               | Description           |
|--------|------------------------|-----------------------|
| POST   | /api/register          | Register new user     |
| POST   | /api/login             | Login                 |
| POST   | /api/logout            | Logout (auth required)|
| POST   | /api/password/forgot   | Request reset link    |
| POST   | /api/password/reset    | Reset password        |

### Users (auth required)
| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| GET    | /api/users                | List users in hierarchy  |
| POST   | /api/users                | Create user              |
| POST   | /api/users/mass           | Bulk create players      |
| GET    | /api/users/:id            | Get user details         |
| PUT    | /api/users/:id            | Update user              |
| POST   | /api/users/:id/block      | Block user               |
| POST   | /api/users/:id/unblock    | Unblock user             |

### Wallet (auth required)
| Method | Endpoint                              | Description        |
|--------|---------------------------------------|--------------------|
| GET    | /api/users/:id/balance                | Get balance        |
| POST   | /api/admin/users/:id/balance/add      | Add funds          |
| POST   | /api/admin/users/:id/balance/remove   | Remove funds       |

### Transactions (auth required)
| Method | Endpoint                   | Description                 |
|--------|----------------------------|-----------------------------|
| GET    | /api/admin/transactions    | Admin: all transactions     |
| GET    | /api/transactions/my       | Player: own transactions    |

---

## Security Notes

- Transactions table: no DELETE or UPDATE via API — enforced at service + entity level.
  For full DB-level enforcement, run in your DB init:
  ```sql
  REVOKE DELETE, UPDATE ON w_transactions FROM your_app_db_user;
  ```
- JWT secret must be set via environment variable — never hardcoded.
- All passwords stored as bcrypt hashes (12 rounds default).
- Rate limiting: 10 auth requests per minute per IP.
- Blocked users are rejected on every request, even with valid tokens.
- Hierarchy scoping: users can only see/manage users in their own subtree.

---

## Running with Docker (optional)

```bash
# PostgreSQL
docker run -d --name fishthunder-pg \
  -e POSTGRES_DB=fishthunder_dev \
  -e POSTGRES_USER=fishuser \
  -e POSTGRES_PASSWORD=fishpass \
  -p 5432:5432 postgres:15

# Redis
docker run -d --name fishthunder-redis -p 6379:6379 redis:7
```
