import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Please add it to your Vercel environment variables."
  );
}

const globalForDb = globalThis as typeof globalThis & {
  __workshopPool?: Pool;
};

export const pool =
  globalForDb.__workshopPool ??
  new Pool({
    connectionString: databaseUrl,
    // Neon requires SSL
    ssl: databaseUrl.includes("neon") ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__workshopPool = pool;
}

export const db = drizzle(pool);
