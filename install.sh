#!/bin/bash
set -e

echo "🔧 Workshop Manager - Local Installation Script"
echo "================================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found! Install Node.js v20+ from https://nodejs.org"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found!"
    echo "Install: sudo apt install postgresql postgresql-contrib"
    echo "Or use Docker (see below)"
    exit 1
fi
echo "✅ PostgreSQL found"

# Start PostgreSQL if not running
if ! pgrep -x postgres > /dev/null; then
    echo "⚠️  Starting PostgreSQL..."
    sudo systemctl start postgresql 2>/dev/null || pg_ctlcluster 14 main start 2>/dev/null || true
fi

# Create database
echo "📦 Setting up database..."
sudo -u postgres psql -c "CREATE DATABASE app_db;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true

# Create .env
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
JWT_SECRET=workshop-local-secret-key-2024
EOF
echo "✅ .env created"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Push schema
echo "📦 Setting up database schema..."
npx drizzle-kit push

# Seed data
echo "📦 Seeding initial data..."
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
npx tsx -e "import 'dotenv/config'; import('./src/db/seed-parts.ts')" || echo "Already seeded"

echo ""
echo "✅ Installation complete!"
echo ""
echo "🚀 To start the app, run:"
echo "   npm run dev"
echo ""
echo "🌐 Then open: http://localhost:3000"
echo ""
echo "🔑 Demo Accounts (password: password123):"
echo "   supervisor1  → Saleem Akhtar (Workshop Supervisor)"
echo "   store1       → Aqib Sherazi (Store Executive)"
echo "   procurement1 → Bashir Ahmad (Procurement Executive)"
echo "   fleetmanager → Hamza Warich (Fleet Manager)"
