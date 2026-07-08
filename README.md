# 🔧 Workshop Manager - Local Installation Guide

A complete Fleet & Workshop Management System for local use.

## Features

✅ **4 User Roles** with full workflow
- Workshop Supervisor (Saleem Akhtar)
- Store Executive (Aqib Sherazi)
- Procurement Executive (Bashir Ahmad)
- Fleet Manager (Hamza Warich)

✅ **Complete Workflow**
- Job Card → Parts Requisition → Decline/Auto-PR → PO → GRN → Issue → Complete
- Vehicle & Staff Management
- Inventory & Lubrication Tracking
- Manager Approvals & Full History

## Quick Start (Docker Method - Easiest)

```bash
# 1. Install PostgreSQL via Docker
docker run -d --name workshop-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=app_db \
  -p 5432:5432 postgres:16

# 2. Create .env
echo "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db" > .env

# 3. Install dependencies
npm install

# 4. Setup database
npx drizzle-kit push

# 5. Seed initial data
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
npx tsx -e "import 'dotenv/config'; import('./src/db/seed-parts.ts')"

# 6. Start app
npm run dev
```

Open **http://localhost:3000**

## Standard Method (Ubuntu/Debian)

```bash
# 1. Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# 2. Setup database
sudo -u postgres psql -c "CREATE DATABASE app_db;"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# 3. Run installer
chmod +x install.sh
./install.sh

# 4. Start app
npm run dev
```

## Windows (PowerShell)

```powershell
# Install PostgreSQL from https://www.postgresql.org/download/windows/
# Create database
psql -U postgres -c "CREATE DATABASE app_db;"

# Setup
echo "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db" > .env
npm install
npx drizzle-kit push
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db"
npx tsx -e "import 'dotenv/config'; import('./src/db/seed-parts.ts')"

# Start
npm run dev
```

## Demo Login Credentials

| Username | Password | Name | Role |
|----------|----------|------|------|
| `supervisor1` | `password123` | Saleem Akhtar | Workshop Supervisor |
| `store1` | `password123` | Aqib Sherazi | Store Executive |
| `procurement1` | `password123` | Bashir Ahmad | Procurement Executive |
| `fleetmanager` | `password123` | Hamza Warich | Fleet Manager |

## How to Use

### 1. Workshop Supervisor (Saleem)
- Login → Dashboard
- Create Job Card → Choose vehicle (or "+ Add New Vehicle")
- Add common issues with one click
- Create Parts Requisition

### 2. Store Executive (Aqib)
- Login → "Parts Issue"
- **Issue** available parts OR **Decline** (sends Auto-PR to Procurement)
- "Lubrication" tab: 100L each of 5 lubricants

### 3. Procurement Executive (Bashir)
- Login → "Purchase Requisitions"
- See auto-PRs from declined parts
- Convert to Purchase Order
- "GRN" → Receive goods → stock auto-updates

### 4. Fleet Manager (Hamza)
- Login → "Approvals" → Approve/Reject
- Job Cards → Click any job → See **Full History Timeline**
- Cancel any job card

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL 16
- **ORM**: Drizzle ORM
- **Auth**: localStorage (offline-friendly)

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/           # Backend API routes
│   │   ├── dashboard/     # Dashboard pages
│   │   └── login/         # Login page
│   ├── db/
│   │   ├── schema.ts      # Database schema
│   │   ├── index.ts       # DB connection
│   │   └── seed-parts.ts  # Seed script
│   └── lib/
│       ├── auth-server.ts # JWT auth
│       ├── local-auth.ts  # Client auth (localStorage)
│       └── utils.ts       # Helpers
├── package.json
├── drizzle.config.json
└── .env
```

## Troubleshooting

### Port 3000 already in use
```bash
# Change port
npm run dev -- -p 3001
```

### Database connection error
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -h 127.0.0.1 -p 5432 app_db
```

### Need to reset everything
```bash
# Drop database and recreate
sudo -u postgres psql -c "DROP DATABASE app_db;"
sudo -u postgres psql -c "CREATE DATABASE app_db;"
npx drizzle-kit push
npx tsx -e "import 'dotenv/config'; import('./src/db/seed-parts.ts')"
```

## Support

For any issues, just describe what's happening and we'll fix it!

---

Made with ❤️ for Fleet & Workshop Management
