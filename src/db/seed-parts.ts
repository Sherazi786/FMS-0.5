import { db } from "@/db";
import { users, branches, vehicles, mechanics, partsMaster, inventory, vendors } from "@/db/schema";
import { hashPassword } from "@/lib/utils";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // Check if already seeded
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("✅ Database already seeded. Skipping.");
    return;
  }

  // Branches
  const branchInsert = await db.insert(branches).values([
    { name: "Central Workshop", location: "Main Campus", code: "CW01" },
    { name: "North Workshop", location: "North Zone", code: "NW01" },
    { name: "South Workshop", location: "South Zone", code: "SW01" },
  ]).returning();

  const password = await hashPassword("password123");

  // Users
  await db.insert(users).values([
    { username: "supervisor1", password, fullName: "Saleem Akhtar", role: "workshop_supervisor", branchId: branchInsert[0].id, status: "active" },
    { username: "store1", password, fullName: "Aqib Sherazi", role: "store_executive", branchId: branchInsert[0].id, status: "active" },
    { username: "procurement1", password, fullName: "Bashir Ahmad", role: "procurement_executive", branchId: branchInsert[0].id, status: "active" },
    { username: "fleetmanager", password, fullName: "Hamza Warich", role: "fleet_manager", branchId: null, status: "active" },
    { username: "mechanic1", password, fullName: "Ravi Kumar", role: "mechanic", branchId: branchInsert[0].id, status: "active" },
    { username: "mechanic2", password, fullName: "Imran Shah", role: "mechanic", branchId: branchInsert[0].id, status: "active" },
  ]);

  // Mechanics
  await db.insert(mechanics).values([
    { name: "Ravi Kumar", specialization: "Engine", branchId: branchInsert[0].id, status: "active" },
    { name: "Imran Shah", specialization: "Electrical", branchId: branchInsert[0].id, status: "active" },
    { name: "Kamran Ali", specialization: "Brakes", branchId: branchInsert[1].id, status: "active" },
    { name: "Ali Hassan", specialization: "Suspension", branchId: branchInsert[1].id, status: "active" },
  ]);

  // Vehicles
  await db.insert(vehicles).values([
    { registrationNumber: "KZ-1790", vehicleType: "Bus", make: "Hino", model: "GD8", year: 2019, branchId: branchInsert[0].id, status: "active" },
    { registrationNumber: "JZ-8194", vehicleType: "Truck", make: "Isuzu", model: "FVR", year: 2020, branchId: branchInsert[0].id, status: "active" },
    { registrationNumber: "JV-8233", vehicleType: "Van", make: "Toyota", model: "HiAce", year: 2021, branchId: branchInsert[0].id, status: "active" },
    { registrationNumber: "KZ-1791", vehicleType: "Bus", make: "Yutong", model: "ZK6122", year: 2018, branchId: branchInsert[1].id, status: "active" },
    { registrationNumber: "JZ-8195", vehicleType: "Truck", make: "Mercedes", model: "Actros", year: 2022, branchId: branchInsert[1].id, status: "active" },
    { registrationNumber: "JV-8234", vehicleType: "Car", make: "Toyota", model: "Corolla", year: 2023, branchId: branchInsert[1].id, status: "active" },
    { registrationNumber: "KZ-2001", vehicleType: "Bus", make: "Hino", model: "RN8", year: 2017, branchId: branchInsert[0].id, status: "active" },
    { registrationNumber: "JZ-2100", vehicleType: "Truck", make: "Faw", model: "CA141", year: 2020, branchId: branchInsert[0].id, status: "active" },
    { registrationNumber: "JV-3050", vehicleType: "Pickup", make: "Toyota", model: "Hilux", year: 2022, branchId: branchInsert[2].id, status: "active" },
    { registrationNumber: "KZ-3100", vehicleType: "Bus", make: "Yutong", model: "E12", year: 2023, branchId: branchInsert[2].id, status: "active" },
  ]);

  // Complete parts list from the spreadsheet
  const partsData = [
    { partNumber: "P001", partName: "Wheel Drum Bearing Sizing and Tooling", category: "Wheel", unit: "set", minStockLevel: 3 },
    { partNumber: "P002", partName: "Majic Tube", category: "Tube", unit: "piece", minStockLevel: 10 },
    { partNumber: "P003", partName: "Alfy Large", category: "General", unit: "piece", minStockLevel: 5 },
    { partNumber: "P004", partName: "Cillicone Tube", category: "Tube", unit: "piece", minStockLevel: 8 },
    { partNumber: "P005", partName: "Oil Filter", category: "Engine", unit: "piece", minStockLevel: 30 },
    { partNumber: "P006", partName: "Air Filter", category: "Engine", unit: "piece", minStockLevel: 30 },
    { partNumber: "P007", partName: "Clutch Bearing", category: "Clutch", unit: "piece", minStockLevel: 5 },
    { partNumber: "P008", partName: "Clutch Plate", category: "Clutch", unit: "piece", minStockLevel: 5 },
    { partNumber: "P009", partName: "Fly Wheel Bearing", category: "Engine", unit: "piece", minStockLevel: 4 },
    { partNumber: "P010", partName: "Cillicone Tube", category: "Tube", unit: "piece", minStockLevel: 8 },
    { partNumber: "P011", partName: "Clutch Plate Leathering (Set)", category: "Clutch", unit: "set", minStockLevel: 3 },
    { partNumber: "P012", partName: "Fan Belt", category: "Engine", unit: "piece", minStockLevel: 6 },
    { partNumber: "P013", partName: "Adjuster Link", category: "Brakes", unit: "piece", minStockLevel: 4 },
    { partNumber: "P014", partName: "Head Light Tube H4", category: "Electrical", unit: "piece", minStockLevel: 10 },
    { partNumber: "P015", partName: "Grip Head Light", category: "Electrical", unit: "piece", minStockLevel: 10 },
    { partNumber: "P016", partName: "Maff Censer", category: "Engine", unit: "piece", minStockLevel: 3 },
    { partNumber: "P017", partName: "Maff Censer Grip", category: "Engine", unit: "piece", minStockLevel: 3 },
    { partNumber: "P018", partName: "Horn 12 Volt", category: "Electrical", unit: "piece", minStockLevel: 5 },
    { partNumber: "P019", partName: "Horn Relay", category: "Electrical", unit: "piece", minStockLevel: 5 },
    { partNumber: "P020", partName: "Horn Lupi", category: "Electrical", unit: "piece", minStockLevel: 8 },
    { partNumber: "P021", partName: "Tape Insulation", category: "Electrical", unit: "piece", minStockLevel: 20 },
    { partNumber: "P022", partName: "Stop Light Glass", category: "Electrical", unit: "piece", minStockLevel: 6 },
    { partNumber: "P023", partName: "Bulb 12 Volt", category: "Electrical", unit: "piece", minStockLevel: 20 },
    { partNumber: "P024", partName: "Holder Bulb", category: "Electrical", unit: "piece", minStockLevel: 8 },
    { partNumber: "P025", partName: "Clutch Cable", category: "Clutch", unit: "piece", minStockLevel: 5 },
    { partNumber: "P026", partName: "Front Wheel Bearing", category: "Wheel", unit: "piece", minStockLevel: 6 },
    { partNumber: "P027", partName: "Oil Level Guage", category: "Engine", unit: "piece", minStockLevel: 3 },
    { partNumber: "P028", partName: "Bush New Fiting", category: "General", unit: "piece", minStockLevel: 6 },
    { partNumber: "P029", partName: "Self Starter Garari", category: "Electrical", unit: "piece", minStockLevel: 2 },
    { partNumber: "P030", partName: "Carbun Bush", category: "Engine", unit: "piece", minStockLevel: 8 },
    { partNumber: "P031", partName: "Flasher Relay", category: "Electrical", unit: "piece", minStockLevel: 5 },
    { partNumber: "P032", partName: "H4 Tube", category: "Electrical", unit: "piece", minStockLevel: 8 },
    { partNumber: "P033", partName: "Grip Tube", category: "Electrical", unit: "piece", minStockLevel: 8 },
    { partNumber: "P034", partName: "Relay Head Light", category: "Electrical", unit: "piece", minStockLevel: 5 },
    { partNumber: "P035", partName: "Tap Insulation", category: "Electrical", unit: "piece", minStockLevel: 10 },
    { partNumber: "P036", partName: "Silencer Welding", category: "Exhaust", unit: "piece", minStockLevel: 2 },
    { partNumber: "P037", partName: "Self Starter Bush Fitting", category: "Electrical", unit: "piece", minStockLevel: 4 },
    { partNumber: "P038", partName: "Self Starter Housing", category: "Electrical", unit: "piece", minStockLevel: 2 },
    { partNumber: "P039", partName: "Carbon Bush Plate", category: "Engine", unit: "piece", minStockLevel: 4 },
    { partNumber: "P040", partName: "Race Cable", category: "General", unit: "piece", minStockLevel: 4 },
    { partNumber: "P041", partName: "Race Paddle", category: "General", unit: "piece", minStockLevel: 3 },
    { partNumber: "P042", partName: "Horn Assembly", category: "Electrical", unit: "piece", minStockLevel: 3 },
    { partNumber: "P043", partName: "Dc Wire", category: "Electrical", unit: "piece", minStockLevel: 10 },
    { partNumber: "P044", partName: "Engine Oil", category: "Lubricants", unit: "liter", minStockLevel: 30 },
    { partNumber: "P045", partName: "Door Handle Inner", category: "Body", unit: "piece", minStockLevel: 4 },
    { partNumber: "P046", partName: "Main Fuse", category: "Electrical", unit: "piece", minStockLevel: 8 },
  ];

  const insertedParts = await db.insert(partsMaster).values(partsData).returning();

  // Initial stock of 10 for each part in Central Workshop
  const inventoryData = insertedParts.map((part) => ({
    partId: part.id,
    branchId: branchInsert[0].id,
    quantity: 10,
    reservedQuantity: 0,
  }));
  await db.insert(inventory).values(inventoryData);

  // Vendors
  await db.insert(vendors).values([
    { name: "AutoParts International", contactPerson: "John Smith", phone: "+92-300-1111111", email: "john@autoparts.com", address: "Lahore, Pakistan", rating: "4.5", status: "active" },
    { name: "National Traders", contactPerson: "Nadeem Ahmed", phone: "+92-300-2222222", email: "nadeem@natraders.com", address: "Karachi, Pakistan", rating: "4.0", status: "active" },
    { name: "Quality Parts Co.", contactPerson: "Sarah Lee", phone: "+92-300-3333333", email: "sarah@qualityparts.com", address: "Islamabad, Pakistan", rating: "4.8", status: "active" },
    { name: "Fleet Supplies Ltd.", contactPerson: "Majid Khan", phone: "+92-300-4444444", email: "majid@fleetsupplies.com", address: "Rawalpindi, Pakistan", rating: "3.5", status: "active" },
  ]);

  console.log("✅ Database seeded successfully!");
  console.log(`   - ${branchInsert.length} branches`);
  console.log(`   - 6 users`);
  console.log(`   - 10 vehicles`);
  console.log(`   - ${insertedParts.length} parts (all with initial stock 10)`);
  console.log(`   - 4 vendors`);
  console.log("\n🔑 Demo Accounts (password: password123):");
  console.log("   supervisor1  → Saleem Akhtar (Workshop Supervisor)");
  console.log("   store1       → Aqib Sherazi (Store Executive)");
  console.log("   procurement1 → Bashir Ahmad (Procurement Executive)");
  console.log("   fleetmanager → Hamza Warich (Fleet Manager)");
}

seed().catch((e) => { console.error(e); process.exit(1); });
