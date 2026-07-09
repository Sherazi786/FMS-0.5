#!/usr/bin/env node
/**
 * One-time setup script for Neon PostgreSQL
 * 
 * Usage:
 *   1. Create .env file with DATABASE_URL
 *   2. Run: node setup-neon.js
 * 
 * This will:
 *   - Push database schema
 *   - Seed initial data
 *   - Verify connection
 */

const { Pool } = require("pg");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Load .env
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...value] = line.split("=");
    if (key && value.length) {
      process.env[key.trim()] = value.join("=").trim().replace(/^["']|["']$/g, "");
    }
  });
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env");
  console.log("\n📝 Create a .env file with:");
  console.log("DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require");
  process.exit(1);
}

console.log("🔧 Workshop Management System - Neon Setup");
console.log("============================================\n");

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("neon") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    // Test connection
    console.log("1️⃣ Testing database connection...");
    const result = await pool.query("SELECT NOW() as time, version()");
    console.log("   ✅ Connected to:", result.rows[0].time);
    console.log("   📦", result.rows[0].version.split(" ").slice(0, 2).join(" "));

    // Check if tables exist
    const tablesRes = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tablesRes.rows.length === 0) {
      console.log("\n2️⃣ No tables found. Pushing schema...");
      try {
        execSync("npx drizzle-kit push --force", { stdio: "inherit" });
        console.log("   ✅ Schema pushed");
      } catch (err) {
        console.error("   ❌ Schema push failed");
        console.error("   Run manually: npx drizzle-kit push");
        process.exit(1);
      }
    } else {
      console.log(`\n2️⃣ Found ${tablesRes.rows.length} tables:`);
      tablesRes.rows.forEach((r) => console.log(`   - ${r.table_name}`));
    }

    // Check if data exists
    const usersRes = await pool.query('SELECT COUNT(*) FROM "users"');
    const userCount = parseInt(usersRes.rows[0].count);

    if (userCount === 0) {
      console.log("\n3️⃣ No users found. Seeding data...");
      try {
        execSync('npx tsx -e "import \'dotenv/config\'; import(\'./src/db/seed-parts.ts\')"', { stdio: "inherit" });
        console.log("   ✅ Seed data inserted");
      } catch (err) {
        console.error("   ❌ Seeding failed");
        console.error("   Run manually: npm run db:seed");
        process.exit(1);
      }
    } else {
      console.log(`\n3️⃣ Found ${userCount} users. Skipping seed.");
    }

    // Verify
    const finalRes = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM branches) as branches,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM parts_master) as parts,
        (SELECT COUNT(*) FROM inventory) as inventory,
        (SELECT COUNT(*) FROM vendors) as vendors
    `);

    const stats = finalRes.rows[0];
    console.log("\n✅ Setup Complete! Database stats:");
    console.log(`   Users: ${stats.users}`);
    console.log(`   Branches: ${stats.branches}`);
    console.log(`   Vehicles: ${stats.vehicles}`);
    console.log(`   Parts: ${stats.parts}`);
    console.log(`   Inventory items: ${stats.inventory}`);
    console.log(`   Vendors: ${stats.vendors}`);

    console.log("\n🔑 Demo Accounts (password: password123):");
    console.log("   supervisor1  → Saleem Akhtar (Workshop Supervisor)");
    console.log("   store1       → Aqib Sherazi (Store Executive)");
    console.log("   procurement1 → Bashir Ahmad (Procurement Executive)");
    console.log("   fleetmanager → Hamza Warich (Fleet Manager)");
    console.log("   accountant   → Adnan Zonal Accountant");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
