import jwt from "jsonwebtoken";
import { db } from "@/db";
import { users, branches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, hashPassword } from "@/lib/utils";

const JWT_SECRET = "workshop-local-secret-key-2024";

// Server-side: verify token from header or cookie, return user info
export async function getSessionFromRequest(req: Request) {
  // Try Authorization header first
  const authHeader = req.headers.get("authorization");
  let token: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "");
  } else {
    // Try cookie
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/session_token=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      username: string;
      role: string;
      branchId: number | null;
    };

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        branchId: users.branchId,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);

    if (!user) return null;

    let branchName: string | null = null;
    if (user.branchId) {
      const [b] = await db
        .select({ name: branches.name })
        .from(branches)
        .where(eq(branches.id, user.branchId))
        .limit(1);
      branchName = b?.name || null;
    }

    return { ...user, branchName };
  } catch {
    return null;
  }
}

export function createToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export async function loginUser(username: string, password: string) {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      password: users.password,
      fullName: users.fullName,
      role: users.role,
      branchId: users.branchId,
      status: users.status,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user || user.status !== "active") return null;

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) return null;

  const { password: _, ...userData } = user;
  const token = createToken({
    id: userData.id,
    username: userData.username,
    role: userData.role,
    branchId: userData.branchId,
  });

  return { user: userData, token };
}

export async function seedDefaultAdmin() {
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, "supervisor1"))
    .limit(1);

  if (!admin) {
    const hashedPw = await hashPassword("password123");
    // Insert branches first if not exist
    const existingBranches = await db.select().from(branches).limit(1);
    let branch1Id = 1;
    if (existingBranches.length === 0) {
      const [b1] = await db
        .insert(branches)
        .values({ name: "Central Workshop", location: "Main Campus", code: "CW01" })
        .returning();
      branch1Id = b1.id;
      await db.insert(branches).values([
        { name: "North Workshop", location: "North Zone", code: "NW01" },
        { name: "South Workshop", location: "South Zone", code: "SW01" },
      ]);
    } else {
      branch1Id = existingBranches[0].id;
    }

    await db.insert(users).values([
      { username: "supervisor1", password: hashedPw, fullName: "Ahmed Khan", role: "workshop_supervisor", branchId: branch1Id, status: "active" },
      { username: "store1", password: hashedPw, fullName: "Usman Malik", role: "store_executive", branchId: branch1Id, status: "active" },
      { username: "procurement1", password: hashedPw, fullName: "Bilal Ahmed", role: "procurement_executive", branchId: branch1Id, status: "active" },
      { username: "fleetmanager", password: hashedPw, fullName: "Hassan Raza", role: "fleet_manager", branchId: null, status: "active" },
    ]);
  }
}
