# Quick Deployment Steps

## 🚀 One-Time Setup

### 1. Create Neon Database
1. Go to https://neon.tech → Sign up
2. Create new project: `workshop-management`
3. Select region (e.g., Singapore for Asia)
4. **Copy the connection string** — you'll need it

### 2. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit - Workshop Management System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/workshop-management.git
git push -u origin main
```

### 3. Deploy to Vercel
1. Go to https://vercel.com → Sign in with GitHub
2. Click **"Add New Project"** → Import your repo
3. Configure:
   - Framework: Next.js (auto)
   - Root Directory: `.`
4. **Add Environment Variables**:
   ```
   DATABASE_URL = postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   JWT_SECRET = make-this-a-long-random-string-123456789
   ```
5. Click **Deploy**

### 4. Initialize Database
After deploy succeeds, run schema and seed:

**Option A — Vercel CLI:**
```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.local
npx drizzle-kit push
npx tsx -e "import 'dotenv/config'; import('./src/db/seed-parts.ts')"
```

**Option B — Local with Neon URL:**
```bash
# In your project
echo "DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require" > .env
npx drizzle-kit push
npx tsx -e "import 'dotenv/config'; import('./src/db/seed-parts.ts')"
```

### 5. Test Your Live Site
- Open your Vercel URL
- Login with `supervisor1` / `password123`
- Test all features

## 🔄 Ongoing Updates

Whenever you make changes:
```bash
git add .
git commit -m "Your changes"
git push
```
Vercel will **auto-deploy** within 1-2 minutes.

## 📞 Need Help?

- Vercel Docs: https://vercel.com/docs
- Neon Docs: https://neon.tech/docs
- Drizzle ORM: https://orm.drizzle.team/docs/overview

## 💡 Pro Tips

1. **Custom Domain**: Vercel → Settings → Domains → Add your domain
2. **Environment Variables**: Vercel → Settings → Environment Variables
3. **Database Backups**: Neon automatically backs up — check Neon dashboard
4. **Monitoring**: Vercel → Analytics tab for performance metrics
5. **Logs**: Vercel → Deployments → Click deployment → View Function Logs
