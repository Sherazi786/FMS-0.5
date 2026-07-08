import { db } from "@/db";
import { users, branches, vehicles, mechanics, partsMaster, inventory, vendors } from "@/db/schema";
import { hashPassword } from "@/lib/utils";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("Database already seeded. Skipping.");
    return;
  }

  // Create branches
  const insertedBranches = await db.insert(branches).values([
    { name: "Central Workshop", location: "Main Campus", code: "CW01" },
    { name: "North Workshop", location: "North Zone", code: "NW01" },
    { name: "South Workshop", location: "South Zone", code: "SW01" },
  ]).returning();

  const password = await hashPassword("password123");

  // Users with NEW names
  await db.insert(users).values([
    { username: "supervisor1", password, fullName: "Saleem Akhtar", role: "workshop_supervisor", branchId: insertedBranches[0].id, status: "active" },
    { username: "store1", password, fullName: "Aqib Sherazi", role: "store_executive", branchId: insertedBranches[0].id, status: "active" },
    { username: "procurement1", password, fullName: "Bashir Ahmad", role: "procurement_executive", branchId: insertedBranches[0].id, status: "active" },
    { username: "fleetmanager", password, fullName: "Hamza Warich", role: "fleet_manager", branchId: null, status: "active" },
    { username: "mechanic1", password, fullName: "Ravi Kumar", role: "mechanic", branchId: insertedBranches[0].id, status: "active" },
    { username: "mechanic2", password, fullName: "Imran Shah", role: "mechanic", branchId: insertedBranches[0].id, status: "active" },
  ]);

  // Vehicles with realistic registration numbers
  const vehicleData = [
    { registrationNumber: "KZ-1790", vehicleType: "Bus", make: "Hino", model: "GD8", year: 2019, branchId: insertedBranches[0].id, status: "active" },
    { registrationNumber: "JZ-8194", vehicleType: "Truck", make: "Isuzu", model: "FVR", year: 2020, branchId: insertedBranches[0].id, status: "active" },
    { registrationNumber: "JV-8233", vehicleType: "Van", make: "Toyota", model: "HiAce", year: 2021, branchId: insertedBranches[0].id, status: "active" },
    { registrationNumber: "KZ-1791", vehicleType: "Bus", make: "Yutong", model: "ZK6122", year: 2018, branchId: insertedBranches[1].id, status: "active" },
    { registrationNumber: "JZ-8195", vehicleType: "Truck", make: "Mercedes", model: "Actros", year: 2022, branchId: insertedBranches[1].id, status: "active" },
    { registrationNumber: "JV-8234", vehicleType: "Car", make: "Toyota", model: "Corolla", year: 2023, branchId: insertedBranches[1].id, status: "active" },
    { registrationNumber: "KZ-2001", vehicleType: "Bus", make: "Hino", model: "RN8", year: 2017, branchId: insertedBranches[0].id, status: "active" },
    { registrationNumber: "JZ-2100", vehicleType: "Truck", make: "Faw", model: "CA141", year: 2020, branchId: insertedBranches[0].id, status: "active" },
    { registrationNumber: "JV-3050", vehicleType: "Pickup", make: "Toyota", model: "Hilux", year: 2022, branchId: insertedBranches[2].id, status: "active" },
    { registrationNumber: "KZ-3100", vehicleType: "Bus", make: "Yutong", model: "E12", year: 2023, branchId: insertedBranches[2].id, status: "active" },
  ];
  await db.insert(vehicles).values(vehicleData);

  // Mechanics
  await db.insert(mechanics).values([
    { name: "Ravi Kumar", specialization: "Engine", branchId: insertedBranches[0].id, status: "active" },
    { name: "Imran Shah", specialization: "Electrical", branchId: insertedBranches[0].id, status: "active" },
    { name: "Kamran Ali", specialization: "Brakes", branchId: insertedBranches[1].id, status: "active" },
    { name: "Ali Hassan", specialization: "Suspension", branchId: insertedBranches[1].id, status: "active" },
  ]);

  // Parts
  const partsData = [
    { partNumber: "ENG-001", partName: "Oil Filter", description: "Engine oil filter", category: "Engine", unit: "piece", minStockLevel: 20 },
    { partNumber: "ENG-002", partName: "Air Filter", description: "Engine air filter", category: "Engine", unit: "piece", minStockLevel: 15 },
    { partNumber: "ENG-003", partName: "Fuel Filter", description: "Diesel fuel filter", category: "Engine", unit: "piece", minStockLevel: 10 },
    { partNumber: "BRK-001", partName: "Brake Pad (Front)", description: "Front brake pads set", category: "Brakes", unit: "set", minStockLevel: 10 },
    { partNumber: "BRK-002", partName: "Brake Pad (Rear)", description: "Rear brake pads set", category: "Brakes", unit: "set", minStockLevel: 10 },
    { partNumber: "BRK-003", partName: "Brake Fluid", description: "DOT 4 brake fluid 1L", category: "Brakes", unit: "liter", minStockLevel: 15 },
    { partNumber: "SUS-001", partName: "Shock Absorber", description: "Front shock absorber", category: "Suspension", unit: "piece", minStockLevel: 5 },
    { partNumber: "SUS-002", partName: "Leaf Spring", description: "Rear leaf spring", category: "Suspension", unit: "piece", minStockLevel: 5 },
    { partNumber: "ELC-001", partName: "Headlight Bulb", description: "H4 headlight bulb", category: "Electrical", unit: "piece", minStockLevel: 20 },
    { partNumber: "ELC-002", partName: "Alternator Belt", description: "Alternator drive belt", category: "Electrical", unit: "piece", minStockLevel: 8 },
    { partNumber: "ELC-003", partName: "Battery 12V", description: "12V 100Ah battery", category: "Electrical", unit: "piece", minStockLevel: 3 },
    { partNumber: "TIR-001", partName: "Tyre 11R22.5", description: "Heavy duty truck tyre", category: "Tyres", unit: "piece", minStockLevel: 10 },
    { partNumber: "TIR-002", partName: "Tyre 7.50R16", description: "Light vehicle tyre", category: "Tyres", unit: "piece", minStockLevel: 8 },
    { partNumber: "LUB-001", partName: "Engine Oil 15W40", description: "Engine oil 4L pack", category: "Lubricants", unit: "pack", minStockLevel: 30 },
    { partNumber: "LUB-002", partName: "Gear Oil 80W90", description: "Gear oil 1L", category: "Lubricants", unit: "liter", minStockLevel: 20 },
  ];
  const insertedParts = await db.insert(partsMaster).values(partsData).returning();

  // Create inventory for both branches
  const inventoryData = insertedParts.flatMap((part) => [
    { partId: part.id, branchId: insertedBranches[0].id, quantity: Math.floor(Math.random() * 40) + 5, reservedQuantity: 0 },
    { partId: part.id, branchId: insertedBranches[1].id, quantity: Math.floor(Math.random() * 20) + 3, reservedQuantity: 0 },
  ]);
  await db.insert(inventory).values(inventoryData);

  // Vendors
  await db.insert(vendors).values([
    { name: "AutoParts International", contactPerson: "John Smith", phone: "+92-300-1111111", email: "john@autoparts.com", address: "Lahore, Pakistan", rating: "4.5", status: "active" },
    { name: "National Traders", contactPerson: "Nadeem Ahmed", phone: "+92-300-2222222", email: "nadeem@natraders.com", address: "Karachi, Pakistan", rating: "4.0", status: "active" },
    { name: "Quality Parts Co.", contactPerson: "Sarah Lee", phone: "+92-300-3333333", email: "sarah@qualityparts.com", address: "Islamabad, Pakistan", rating: "4.8", status: "active" },
    { name: "Fleet Supplies Ltd.", contactPerson: "Majid Khan", phone: "+92-300-4444444", email: "majid@fleetsupplies.com", address: "Rawalpindi, Pakistan", rating: "3.5", status: "active" },
  ]);

  console.log("Database seeded successfully!");
  console.log("\nDemo Accounts (password: password123):");
  console.log("- supervisor1 → Saleem Akhtar (Workshop Supervisor)");
  console.log("- store1 → Aqib Sherazi (Store Executive)");
  console.log("- procurement1 → Bashir Ahmad (Procurement Executive)");
  console.log("- fleetmanager → Hamza Warich (Fleet Manager)");
}

seed().catch(console.error);
