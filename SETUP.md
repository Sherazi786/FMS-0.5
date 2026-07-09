# ⚡ Quick Setup (After Vercel Deploy)

The error you're seeing:
```
error: relation "users" does not exist
```
means your **Neon database is empty** — no tables created yet. Fix it now:

## 🔧 One-Time Setup (5 minutes)

### Step 1: Get Your Neon DATABASE_URL

1. Go to https://neon.tech → Login
2. Click your project
3. Copy the **Connection String** (looks like):
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

### Step 2: Run Setup Locally

```bash
# In your project directory, create .env file
cat > .env << EOF
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=any-random-string-here-123456789
EOF

# Install dependencies (if not done)
npm install

# Run the setup script (recommended)
node setup-neon.js

# OR run manually:
npx drizzle-kit push
npx tsx -e "import 'dotenv/config'; import('./src/db/seed-parts.ts')"
```

The `setup-neon.js` script will:
- ✅ Test connection
- ✅ Create all 14+ tables
- ✅ Seed 6 users, 3 branches, 10 vehicles, 51 parts, 4 vendors
- ✅ Show database stats

### Step 3: Verify in Vercel

After running the setup:
1. Go to your Vercel URL
2. Try login: `supervisor1` / `password123`
3. Should work perfectly! ✅

## 🆘 Troubleshooting

### "relation does not exist"
→ Database not initialized. Run `node setup-neon.js`

### "connection refused"
→ Check Neon URL is correct, includes `?sslmode=require`

### "password authentication failed"
→ Wrong Neon password. Get fresh connection string from Neon dashboard

### Still not working?
Check Vercel logs:
- Vercel Dashboard → Deployments → Click latest → "Logs" tab
- Look for "DATABASE_URL" or "relation" errors

## 📊 What Gets Created

The setup script creates:
- **6 Users**: Saleem, Aqib, Bashir, Hamza, Adnan + 1 mechanic
- **3 Branches**: Central, North, South Workshop
- **10 Vehicles**: KZ-1790, JZ-8194, etc.
- **51 Parts**: Engine, Brakes, Lubricants, etc.
- **5 Lubricants**: 100L each
- **4 Vendors**: AutoParts, National, Quality, Fleet
- **4 Mechanics**: Engine, Electrical, Brakes, Suspension

All linked with proper foreign keys and initial stock of 10 units per part.
