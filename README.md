# 🔧 Workshop Management System

A complete Fleet & Workshop Management System for production deployment.

## Features

- **5 User Roles** with role-based dashboards
  - Workshop Supervisor (Saleem Akhtar)
  - Store Executive (Aqib Sherazi)
  - Procurement Executive (Bashir Ahmad)
  - Fleet Manager (Hamza Warich)
  - Zonal Accountant (Adnan Zonal)
- **Complete Workflow**: Job Card → Requisition → Approval → PR → PO → GRN → Issue → Complete
- **Vehicle & Staff Management** with free-text designations
- **Inventory & Lubrication** with auto low-stock alerts
- **Debit Vouchers** auto-generated from POs with payment tracking
- **Manager Full Access** with delete permissions + 10s real-time sync
- **Date Range Filters** and **CSV Export** for monthly reports

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes (Node.js)
- **Database**: PostgreSQL 16 (Neon recommended for production)
- **ORM**: Drizzle ORM
- **Auth**: JWT + localStorage

## 🚀 Deployment Guide

### Step 1: Setup Neon PostgreSQL

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project: `workshop-management`
3. Copy the **Connection String** (it will look like: `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)
4. Save this as `DATABASE_URL`

### Step 2: Push to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Workshop Management System"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/workshop-management.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "**Add New Project**" → "**Import Git Repository**"
3. Select your `workshop-management` repo
4. Configure project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

5. **Environment Variables** (CRITICAL — add these before deploying):
   ```
   DATABASE_URL = postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   JWT_SECRET = your-random-secret-key-here-make-it-long
   ```

6. Click "**Deploy**"

### Step 4: Run Database Migration (After First Deploy)

After successful deployment, you need to set up the database schema. You have **two options**:

#### Option A: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link to your project
vercel link

# Run the seed script via Vercel env
vercel env pull .env.local
npx drizzle-kit push
DATABASE_URL=$(cat .env.local | grep DATABASE_URL | cut -d= -f2) npx tsx -e "import 'dotenv/config'; import('./src/db/seed-parts.ts')"
```

#### Option B: Local with Neon Connection

```bash
# In your local repo
echo "DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require" > .env
npm install
npx drizzle-kit push
npx tsx -e "import 'dotenv/config'; import('./src/db/seed-parts.ts')"
```

This will:
- Create all tables in Neon
- Seed initial data: users, branches, vehicles, parts, vendors, etc.

### Step 5: Verify Deployment

1. Open your Vercel URL (e.g., `https://workshop-management-xxx.vercel.app`)
2. Login with any demo account
3. Verify all features work

## 🔑 Demo Accounts

All passwords: `password123`

| Username | Name | Role | Email |
|----------|------|------|-------|
| `supervisor1` | Saleem Akhtar | Workshop Supervisor | - |
| `store1` | Aqib Sherazi | Store Executive | - |
| `procurement1` | Bashir Ahmad | Procurement Executive | - |
| `fleetmanager` | Hamza Warich | Fleet Manager | - |
| `accountant` | Adnan Zonal | Zonal Accountant | - |

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ (or Docker)

### Setup

```bash
# 1. Clone repo
git clone https://github.com/YOUR_USERNAME/workshop-management.git
cd workshop-management

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# 4. Setup database
npx drizzle-kit push

# 5. Seed data
npx tsx -e "import 'dotenv/config'; import('./src/db/seed-parts.ts')"

# 6. Start dev server
npm run dev
```

Open: **http://localhost:3000**

## 📁 Project Structure

```
workshop-management/
├── src/
│   ├── app/
│   │   ├── api/              # Backend API routes
│   │   │   ├── auth/         # Login, logout, me
│   │   │   ├── job-cards/    # Job CRUD
│   │   │   ├── inventory/    # Parts + stock
│   │   │   ├── requisition/  # Parts requisition
│   │   │   ├── procurement/  # PR + PO + GRN
│   │   │   ├── vouchers/     # Debit vouchers
│   │   │   ├── staff/        # Mechanics
│   │   │   ├── vehicles/     # Vehicle CRUD
│   │   │   ├── vendors/      # Vendor CRUD
│   │   │   ├── branches/     # Branches
│   │   │   ├── lubrication/  # Lubrication transactions
│   │   │   ├── approvals/    # Job card approvals
│   │   │   ├── manager-actions/ # Manager delete operations
│   │   │   ├── dashboard/    # Dashboard data
│   │   │   └── health/       # Health check
│   │   ├── dashboard/        # Dashboard pages
│   │   │   ├── job-cards/    # Job card management
│   │   │   ├── completed-jobs/  # Completed jobs history
│   │   │   ├── inventory/    # Inventory page
│   │   │   ├── parts-issue/  # Parts issue
│   │   │   ├── requisitions/ # Parts requisition
│   │   │   ├── purchase-orders/
│   │   │   ├── purchase-requisitions/
│   │   │   ├── purchase-records/  # Monthly sheet
│   │   │   ├── grn/          # Goods receipt
│   │   │   ├── lubrication/  # Lubrication page
│   │   │   ├── vouchers/     # Vouchers page
│   │   │   ├── approvals/    # Manager approvals
│   │   │   ├── staff/        # Mechanics
│   │   │   ├── staff-list/   # Custom staff
│   │   │   ├── vehicles/     # Vehicles
│   │   │   ├── vendors/      # Vendors
│   │   │   └── reports/      # Reports
│   │   ├── login/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── error.tsx
│   │   ├── global-error.tsx
│   │   ├── loading.tsx
│   │   └── not-found.tsx
│   ├── db/
│   │   ├── schema.ts         # Database schema
│   │   ├── index.ts          # DB connection
│   │   └── seed-parts.ts     # Seed script
│   └── lib/
│       ├── auth-server.ts    # JWT + auth
│       ├── local-auth.ts     # localStorage
│       └── utils.ts           # Helpers
├── .env.example
├── .gitignore
├── drizzle.config.json
├── next.config.ts
├── package.json
├── README.md
├── tsconfig.json
└── vercel.json
```

## 🔧 Common Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Type check
npm exec tsc -- --noEmit

# Database
npx drizzle-kit push           # Apply schema
npx drizzle-kit studio          # Open DB studio

# Deploy
vercel --prod
```

## 🔒 Security Notes

- All passwords are hashed with bcrypt
- JWT tokens with 7-day expiry
- HTTPS-only cookies in production
- API routes check role-based permissions
- Server-side validation for all inputs

## 📊 Database Schema

The system uses 14+ tables:
- `users`, `branches`, `mechanics`
- `vehicles`, `parts_master`, `inventory`
- `job_cards`, `parts_requisition`, `parts_requisition_items`
- `purchase_requisition`, `purchase_requisition_items`
- `purchase_orders`, `purchase_order_items`
- `grn`, `grn_items`
- `vendors`, `stock_transactions`
- `custom_staff`, `debit_vouchers`

## 🆘 Troubleshooting

### Build Fails on Vercel
- Check `DATABASE_URL` is correctly set
- Ensure `JWT_SECRET` is set
- Check Vercel logs for detailed errors

### Database Connection Issues
- Neon requires `?sslmode=require` in connection string
- Make sure IP is not restricted (Neon allows all by default)

### Data Not Showing
- Run the seed script after deploy
- Check `/api/health` endpoint returns 200
- Verify `DATABASE_URL` in Vercel environment

## 📜 License

MIT
