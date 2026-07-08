import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", [
  "workshop_supervisor",
  "store_executive",
  "procurement_executive",
  "fleet_manager",
  "mechanic",
  "accountant",
]);

export const userStatusEnum = pgEnum("user_status", ["active", "inactive"]);

export const jobStatusEnum = pgEnum("job_status", [
  "open",
  "in_progress",
  "pending_parts",
  "completed",
  "cancelled",
]);

export const requisitionStatusEnum = pgEnum("requisition_status", [
  "pending",
  "approved",
  "rejected",
  "fulfilled",
]);

export const purchaseStatusEnum = pgEnum("purchase_status", [
  "draft",
  "pending_approval",
  "approved",
  "ordered",
  "partial_received",
  "completed",
  "cancelled",
]);

export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "urgent"]);

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  role: roleEnum("role").notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  status: userStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Branches/Workshops
export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  location: varchar("location", { length: 300 }),
  code: varchar("code", { length: 20 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Vehicles
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  registrationNumber: varchar("registration_number", { length: 50 }).notNull().unique(),
  vehicleType: varchar("vehicle_type", { length: 100 }),
  make: varchar("make", { length: 100 }),
  model: varchar("model", { length: 100 }),
  year: integer("year"),
  branchId: integer("branch_id").references(() => branches.id),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Mechanics
export const mechanics = pgTable("mechanics", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  specialization: varchar("specialization", { length: 200 }),
  branchId: integer("branch_id").references(() => branches.id),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Job Cards
export const jobCards = pgTable("job_cards", {
  id: serial("id").primaryKey(),
  jobCardNumber: varchar("job_card_number", { length: 50 }).notNull().unique(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  mechanicId: integer("mechanic_id").references(() => mechanics.id),
  supervisorId: integer("supervisor_id").references(() => users.id),
  description: text("description").notNull(),
  priority: priorityEnum("priority").default("medium").notNull(),
  status: jobStatusEnum("status").default("open").notNull(),
  reportedDate: timestamp("reported_date").defaultNow().notNull(),
  startDate: timestamp("start_date"),
  completedDate: timestamp("completed_date"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Parts Master
export const partsMaster = pgTable("parts_master", {
  id: serial("id").primaryKey(),
  partNumber: varchar("part_number", { length: 100 }).notNull().unique(),
  partName: varchar("part_name", { length: 300 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  unit: varchar("unit", { length: 50 }).default("piece"),
  minStockLevel: integer("min_stock_level").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Inventory/Stock
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").references(() => partsMaster.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  quantity: integer("quantity").default(0).notNull(),
  reservedQuantity: integer("reserved_quantity").default(0).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// Parts Requisition
export const partsRequisition = pgTable("parts_requisition", {
  id: serial("id").primaryKey(),
  requisitionNumber: varchar("requisition_number", { length: 50 }).notNull().unique(),
  jobCardId: integer("job_card_id").references(() => jobCards.id).notNull(),
  requestedBy: integer("requested_by").references(() => users.id).notNull(),
  status: requisitionStatusEnum("status").default("pending").notNull(),
  remarks: text("remarks"),
  requestedDate: timestamp("requested_date").defaultNow().notNull(),
  fulfilledDate: timestamp("fulfilled_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Parts Requisition Items
export const partsRequisitionItems = pgTable("parts_requisition_items", {
  id: serial("id").primaryKey(),
  requisitionId: integer("requisition_id").references(() => partsRequisition.id).notNull(),
  partId: integer("part_id").references(() => partsMaster.id).notNull(),
  quantityRequested: integer("quantity_requested").notNull(),
  quantityIssued: integer("quantity_issued").default(0),
  quantityAvailable: integer("quantity_available").default(0),
  issued: boolean("issued").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Vendors
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 300 }).notNull(),
  contactPerson: varchar("contact_person", { length: 200 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 200 }),
  address: text("address"),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Purchase Requisition
export const purchaseRequisition = pgTable("purchase_requisition", {
  id: serial("id").primaryKey(),
  prNumber: varchar("pr_number", { length: 50 }).notNull().unique(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  requestedBy: integer("requested_by").references(() => users.id).notNull(),
  status: requisitionStatusEnum("status").default("pending").notNull(),
  priority: priorityEnum("priority").default("medium").notNull(),
  remarks: text("remarks"),
  requestedDate: timestamp("requested_date").defaultNow().notNull(),
  approvedDate: timestamp("approved_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Purchase Requisition Items
export const purchaseRequisitionItems = pgTable("purchase_requisition_items", {
  id: serial("id").primaryKey(),
  prId: integer("pr_id").references(() => purchaseRequisition.id).notNull(),
  partId: integer("part_id").references(() => partsMaster.id).notNull(),
  quantity: integer("quantity").notNull(),
  estimatedPrice: decimal("estimated_price", { precision: 12, scale: 2 }),
  vendorId: integer("vendor_id").references(() => vendors.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Purchase Orders
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: varchar("po_number", { length: 50 }).notNull().unique(),
  prId: integer("pr_id").references(() => purchaseRequisition.id),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  status: purchaseStatusEnum("status").default("draft").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).default("0"),
  orderDate: timestamp("order_date").defaultNow(),
  expectedDelivery: timestamp("expected_delivery"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Purchase Order Items
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").references(() => purchaseOrders.id).notNull(),
  partId: integer("part_id").references(() => partsMaster.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  receivedQuantity: integer("received_quantity").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Goods Receipt Note (GRN)
export const grn = pgTable("grn", {
  id: serial("id").primaryKey(),
  grnNumber: varchar("grn_number", { length: 50 }).notNull().unique(),
  poId: integer("po_id").references(() => purchaseOrders.id).notNull(),
  receivedBy: integer("received_by").references(() => users.id).notNull(),
  receivedDate: timestamp("received_date").defaultNow().notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// GRN Items
export const grnItems = pgTable("grn_items", {
  id: serial("id").primaryKey(),
  grnId: integer("grn_id").references(() => grn.id).notNull(),
  poItemId: integer("po_item_id").references(() => purchaseOrderItems.id).notNull(),
  partId: integer("part_id").references(() => partsMaster.id).notNull(),
  quantityReceived: integer("quantity_received").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Stock Transactions (audit trail)
export const stockTransactions = pgTable("stock_transactions", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").references(() => partsMaster.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  transactionType: varchar("transaction_type", { length: 50 }).notNull(),
  quantity: integer("quantity").notNull(),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: integer("reference_id"),
  performedBy: integer("performed_by").references(() => users.id),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Debit Vouchers (auto-generated from POs)
export const debitVouchers = pgTable("debit_vouchers", {
  id: serial("id").primaryKey(),
  voucherNumber: varchar("voucher_number", { length: 50 }).notNull().unique(),
  poId: integer("po_id").references(() => purchaseOrders.id).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending, paid, partial
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0"),
  paidDate: timestamp("paid_date"),
  paidBy: integer("paid_by").references(() => users.id),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentReference: varchar("payment_reference", { length: 200 }),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User-defined staff (no role-based restriction)
export const customStaff = pgTable("custom_staff", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  designation: varchar("designation", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 200 }),
  branchId: integer("branch_id").references(() => branches.id),
  status: varchar("status", { length: 50 }).default("active"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
