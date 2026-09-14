// prisma/seed.ts
//
// Seeds:
//  - 8 default Chart of Accounts + 4 default Journals (MVP.md §4.3/4.4 — mandatory)
//  - 3 Product Categories
//  - 6 Products
//  - 4 Contacts (2 Vendor, 2 Customer)
//  - 4 Users (Admin, Accountant, 2 Contact/portal users linked to customer contacts)
//  - 3 Vendor Bills (Paid / Partial / Not Paid) + matching BillPayments
//  - 3 Customer Invoices (Paid / Partial / Not Paid) + matching InvoicePayments
//
// Safe to re-run: uses upsert (or manual find-then-create) so it will NOT
// create duplicates on repeat runs.
//
// Run with: npx prisma db seed

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import {
  AccountType,
  JournalType,
  ContactType,
  ProductType,
  UserRole,
  DocStatus,
  PaymentStatus,
  PaymentType,
  PaymentVia,
  PaymentDocStatus,
} from "../src/generated/prisma/enums.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

// ------------------------------------------------------------------
// Helpers (idempotent — safe to re-run)
// ------------------------------------------------------------------

async function upsertAccount(name: string, type: AccountType) {
  const existing = await prisma.account.findFirst({ where: { name } });
  if (existing) return existing;
  const created = await prisma.account.create({ data: { name, type } });
  console.log(`  + Account "${name}" (${type})`);
  return created;
}

async function upsertJournal(
  name: string,
  type: JournalType,
  defaultAccountId: string
) {
  const existing = await prisma.journal.findFirst({ where: { name } });
  if (existing) return existing;
  const created = await prisma.journal.create({
    data: { name, type, defaultAccountId },
  });
  console.log(`  + Journal "${name}" (${type})`);
  return created;
}

async function upsertCategory(name: string) {
  return prisma.category.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function upsertProduct(data: {
  name: string;
  type: ProductType;
  categoryId: string;
  salesPrice: number;
  cost: number;
}) {
  const existing = await prisma.product.findFirst({ where: { name: data.name } });
  if (existing) return existing;
  const created = await prisma.product.create({ data });
  console.log(`  + Product "${data.name}"`);
  return created;
}

async function upsertContact(data: {
  name: string;
  type: ContactType;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
}) {
  return prisma.contact.upsert({
    where: { email: data.email },
    update: {},
    create: data,
  });
}

async function upsertUser(data: {
  name: string;
  loginId: string;
  email: string;
  plainPassword: string;
  role: UserRole;
  contactId?: string;
}) {
  const existing = await prisma.user.findFirst({ where: { loginId: data.loginId } });
  if (existing) return existing;
  const password = await bcrypt.hash(data.plainPassword, 10);
  const created = await prisma.user.create({
    data: {
      name: data.name,
      loginId: data.loginId,
      email: data.email,
      password,
      role: data.role,
      contactId: data.contactId,
    },
  });
  console.log(`  + User "${data.loginId}" (${data.role}) — password: ${data.plainPassword}`);
  return created;
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

async function main() {
  console.log("Seeding Chart of Accounts...");
  const bankAccount = await upsertAccount("Bank A/c", AccountType.ASSET);
  const cashAccount = await upsertAccount("Cash A/c", AccountType.ASSET);
  await upsertAccount("Debtors A/c", AccountType.ASSET);
  await upsertAccount("Creditors A/c", AccountType.LIABILITY);
  const salesIncomeAccount = await upsertAccount("Sales Income A/c", AccountType.INCOME);
  const purchaseExpenseAccount = await upsertAccount(
    "Purchase Expense A/c",
    AccountType.EXPENSE
  );
  await upsertAccount("Other Expense A/c", AccountType.OTHER_EXPENSE);
  await upsertAccount("Capital A/c", AccountType.CAPITAL);

  console.log("\nSeeding Journals...");
  await upsertJournal("Sales", JournalType.SALES, salesIncomeAccount.id);
  await upsertJournal("Purchase", JournalType.PURCHASE, purchaseExpenseAccount.id);
  await upsertJournal("Bank", JournalType.BANK, bankAccount.id);
  await upsertJournal("Cash", JournalType.CASH, cashAccount.id);

  console.log("\nSeeding Categories...");
  const chairsCategory = await upsertCategory("Chairs");
  const tablesCategory = await upsertCategory("Tables");
  const sofasCategory = await upsertCategory("Sofas & Storage");

  console.log("\nSeeding Products...");
  const woodenChair = await upsertProduct({
    name: "Wooden Dining Chair",
    type: ProductType.GOODS,
    categoryId: chairsCategory.id,
    salesPrice: 1500,
    cost: 900,
  });
  const officeChair = await upsertProduct({
    name: "Ergonomic Office Chair",
    type: ProductType.GOODS,
    categoryId: chairsCategory.id,
    salesPrice: 2000,
    cost: 1200,
  });
  const diningTable = await upsertProduct({
    name: "6-Seater Dining Table",
    type: ProductType.GOODS,
    categoryId: tablesCategory.id,
    salesPrice: 8000,
    cost: 5000,
  });
  const coffeeTable = await upsertProduct({
    name: "Glass Coffee Table",
    type: ProductType.GOODS,
    categoryId: tablesCategory.id,
    salesPrice: 4000,
    cost: 2400,
  });
  const sofaSet = await upsertProduct({
    name: "3-Seater Sofa Set",
    type: ProductType.GOODS,
    categoryId: sofasCategory.id,
    salesPrice: 25000,
    cost: 16000,
  });
  const bookshelf = await upsertProduct({
    name: "5-Tier Wooden Bookshelf",
    type: ProductType.GOODS,
    categoryId: sofasCategory.id,
    salesPrice: 3000,
    cost: 1800,
  });

  console.log("\nSeeding Contacts...");
  const vendorRahul = await upsertContact({
    name: "Rahul Furniture Traders",
    type: ContactType.VENDOR,
    email: "rahul.traders@example.com",
    phone: "9876543210",
    city: "Chennai",
    state: "Tamil Nadu",
    country: "India",
  });
  const vendorMeera = await upsertContact({
    name: "Meera Woodworks",
    type: ContactType.VENDOR,
    email: "meera.woodworks@example.com",
    phone: "9876500011",
    city: "Coimbatore",
    state: "Tamil Nadu",
    country: "India",
  });
  const customerAnanya = await upsertContact({
    name: "Ananya Home Decor",
    type: ContactType.CUSTOMER,
    email: "ananya.decor@example.com",
    phone: "9123456789",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  });
  const customerVikram = await upsertContact({
    name: "Vikram Retail Store",
    type: ContactType.CUSTOMER,
    email: "vikram.retail@example.com",
    phone: "9988776655",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
  });

  console.log("\nSeeding Users...");
  await upsertUser({
    name: "Admin User",
    loginId: "admin01",
    email: "admin@urbanfurniture.com",
    plainPassword: "Admin@123",
    role: UserRole.ADMIN,
  });
  await upsertUser({
    name: "Accountant User",
    loginId: "accnt01",
    email: "accountant@urbanfurniture.com",
    plainPassword: "Account@123",
    role: UserRole.ACCOUNTANT,
  });
  await upsertUser({
    name: "Ananya Portal Login",
    loginId: "ananya01",
    email: "portal.ananya@example.com",
    plainPassword: "Portal@123",
    role: UserRole.CONTACT,
    contactId: customerAnanya.id,
  });
  await upsertUser({
    name: "Vikram Portal Login",
    loginId: "vikram01",
    email: "portal.vikram@example.com",
    plainPassword: "Portal@123",
    role: UserRole.CONTACT,
    contactId: customerVikram.id,
  });

  // ------------------------------------------------------------------
  // Vendor Bills — one Paid, one Partial, one Not Paid
  // ------------------------------------------------------------------
  console.log("\nSeeding Vendor Bills...");

  const bill1Total = 15000; // 10 x Wooden Dining Chair @ 1500
  const bill1 = await prisma.vendorBill.upsert({
    where: { billNumber: "BILL/2026/0001" },
    update: {},
    create: {
      billNumber: "BILL/2026/0001",
      reference: "PO-REF-001",
      vendorId: vendorRahul.id,
      billDate: new Date("2026-08-01"),
      dueDate: new Date("2026-08-15"),
      status: DocStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      total: bill1Total,
      amountDue: 0,
      lines: {
        create: [
          {
            productId: woodenChair.id,
            accountId: purchaseExpenseAccount.id,
            qty: 10,
            unitPrice: 1500,
            total: 15000,
          },
        ],
      },
    },
  });
  await prisma.billPayment.create({
    data: {
      paymentType: PaymentType.SEND,
      partnerId: vendorRahul.id,
      vendorBillId: bill1.id,
      amount: bill1Total,
      date: new Date("2026-08-10"),
      paymentVia: PaymentVia.BANK,
      status: PaymentDocStatus.CONFIRMED,
    },
  });
  console.log(`  + Vendor Bill ${bill1.billNumber} — PAID`);

  const bill2Total = 40000; // 5 x Dining Table @ 8000
  const bill2Paid = 20000;
  const bill2 = await prisma.vendorBill.upsert({
    where: { billNumber: "BILL/2026/0002" },
    update: {},
    create: {
      billNumber: "BILL/2026/0002",
      reference: "PO-REF-002",
      vendorId: vendorMeera.id,
      billDate: new Date("2026-08-05"),
      dueDate: new Date("2026-08-20"),
      status: DocStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PARTIAL,
      total: bill2Total,
      amountDue: bill2Total - bill2Paid,
      lines: {
        create: [
          {
            productId: diningTable.id,
            accountId: purchaseExpenseAccount.id,
            qty: 5,
            unitPrice: 8000,
            total: 40000,
          },
        ],
      },
    },
  });
  await prisma.billPayment.create({
    data: {
      paymentType: PaymentType.SEND,
      partnerId: vendorMeera.id,
      vendorBillId: bill2.id,
      amount: bill2Paid,
      date: new Date("2026-08-12"),
      paymentVia: PaymentVia.BANK,
      status: PaymentDocStatus.CONFIRMED,
    },
  });
  console.log(`  + Vendor Bill ${bill2.billNumber} — PARTIAL`);

  const bill3Total = 24000; // 8 x Bookshelf @ 3000
  const bill3 = await prisma.vendorBill.upsert({
    where: { billNumber: "BILL/2026/0003" },
    update: {},
    create: {
      billNumber: "BILL/2026/0003",
      reference: "PO-REF-003",
      vendorId: vendorRahul.id,
      billDate: new Date("2026-08-10"),
      dueDate: new Date("2026-08-25"),
      status: DocStatus.CONFIRMED,
      paymentStatus: PaymentStatus.NOT_PAID,
      total: bill3Total,
      amountDue: bill3Total,
      lines: {
        create: [
          {
            productId: bookshelf.id,
            accountId: purchaseExpenseAccount.id,
            qty: 8,
            unitPrice: 3000,
            total: 24000,
          },
        ],
      },
    },
  });
  console.log(`  + Vendor Bill ${bill3.billNumber} — NOT PAID`);

  // ------------------------------------------------------------------
  // Customer Invoices — one Paid, one Partial, one Not Paid
  // ------------------------------------------------------------------
  console.log("\nSeeding Customer Invoices...");

  const inv1Total = 50000; // 2 x Sofa Set @ 25000
  const inv1 = await prisma.customerInvoice.upsert({
    where: { invoiceNumber: "INV/2026/0001" },
    update: {},
    create: {
      invoiceNumber: "INV/2026/0001",
      reference: "SO-REF-001",
      customerId: customerAnanya.id,
      invoiceDate: new Date("2026-08-02"),
      dueDate: new Date("2026-08-16"),
      status: DocStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      total: inv1Total,
      amountDue: 0,
      lines: {
        create: [
          {
            productId: sofaSet.id,
            accountId: salesIncomeAccount.id,
            qty: 2,
            unitPrice: 25000,
            total: 50000,
          },
        ],
      },
    },
  });
  await prisma.invoicePayment.create({
    data: {
      paymentType: PaymentType.RECEIVE,
      partnerId: customerAnanya.id,
      customerInvoiceId: inv1.id,
      amount: inv1Total,
      date: new Date("2026-08-09"),
      paymentVia: PaymentVia.BANK,
      status: PaymentDocStatus.CONFIRMED,
    },
  });
  console.log(`  + Customer Invoice ${inv1.invoiceNumber} — PAID`);

  const inv2Total = 30000; // 15 x Office Chair @ 2000
  const inv2Paid = 10000;
  const inv2 = await prisma.customerInvoice.upsert({
    where: { invoiceNumber: "INV/2026/0002" },
    update: {},
    create: {
      invoiceNumber: "INV/2026/0002",
      reference: "SO-REF-002",
      customerId: customerVikram.id,
      invoiceDate: new Date("2026-08-06"),
      dueDate: new Date("2026-08-21"),
      status: DocStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PARTIAL,
      total: inv2Total,
      amountDue: inv2Total - inv2Paid,
      lines: {
        create: [
          {
            productId: officeChair.id,
            accountId: salesIncomeAccount.id,
            qty: 15,
            unitPrice: 2000,
            total: 30000,
          },
        ],
      },
    },
  });
  await prisma.invoicePayment.create({
    data: {
      paymentType: PaymentType.RECEIVE,
      partnerId: customerVikram.id,
      customerInvoiceId: inv2.id,
      amount: inv2Paid,
      date: new Date("2026-08-13"),
      paymentVia: PaymentVia.CASH,
      status: PaymentDocStatus.CONFIRMED,
    },
  });
  console.log(`  + Customer Invoice ${inv2.invoiceNumber} — PARTIAL`);

  const inv3Total = 16000; // 4 x Coffee Table @ 4000
  const inv3 = await prisma.customerInvoice.upsert({
    where: { invoiceNumber: "INV/2026/0003" },
    update: {},
    create: {
      invoiceNumber: "INV/2026/0003",
      reference: "SO-REF-003",
      customerId: customerAnanya.id,
      invoiceDate: new Date("2026-08-11"),
      dueDate: new Date("2026-08-26"),
      status: DocStatus.CONFIRMED,
      paymentStatus: PaymentStatus.NOT_PAID,
      total: inv3Total,
      amountDue: inv3Total,
      lines: {
        create: [
          {
            productId: coffeeTable.id,
            accountId: salesIncomeAccount.id,
            qty: 4,
            unitPrice: 4000,
            total: 16000,
          },
        ],
      },
    },
  });
  console.log(`  + Customer Invoice ${inv3.invoiceNumber} — NOT PAID`);

  console.log("\n✅ Seed complete.");
  console.log("\nLogin credentials for testing:");
  console.log("  admin01 / Admin@123        (ADMIN)");
  console.log("  accnt01 / Account@123      (ACCOUNTANT)");
  console.log("  ananya01 / Portal@123      (CONTACT — Ananya Home Decor)");
  console.log("  vikram01 / Portal@123      (CONTACT — Vikram Retail Store)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });