// prisma/seed.ts
//
// Seeds the mandatory default Chart of Accounts (8 rows) and Journals (4 rows)
// as specified in MVP.md §4.3 and §4.4. These MUST exist before any
// Purchase/Sales/Bill/Invoice/Journal Entry flows can work correctly, since
// those flows default to specific accounts by name.
//
// Safe to re-run: checks for existing rows by name before creating, so
// running this multiple times will NOT create duplicates.
//
// Run with: npx prisma db seed
 
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { AccountType, JournalType } from "../src/generated/prisma/enums.ts";
import { PrismaPg } from "@prisma/adapter-pg";
 
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });
 
async function upsertAccount(name: string, type: AccountType) {
  const existing = await prisma.account.findFirst({ where: { name } });
  if (existing) {
    console.log(`  ✓ Account "${name}" already exists — skipping`);
    return existing;
  }
  const created = await prisma.account.create({ data: { name, type } });
  console.log(`  + Created account "${name}" (${type})`);
  return created;
}
 
async function upsertJournal(
  name: string,
  type: JournalType,
  defaultAccountId: string
) {
  const existing = await prisma.journal.findFirst({ where: { name } });
  if (existing) {
    console.log(`  ✓ Journal "${name}" already exists — skipping`);
    return existing;
  }
  const created = await prisma.journal.create({
    data: { name, type, defaultAccountId },
  });
  console.log(`  + Created journal "${name}" (${type})`);
  return created;
}
 
async function main() {
  console.log("Seeding Chart of Accounts...");
 
  const bankAccount = await upsertAccount("Bank A/c", AccountType.ASSET);
  const cashAccount = await upsertAccount("Cash A/c", AccountType.ASSET);
  await upsertAccount("Debtors A/c", AccountType.ASSET);
  await upsertAccount("Creditors A/c", AccountType.LIABILITY);
  const salesIncomeAccount = await upsertAccount(
    "Sales Income A/c",
    AccountType.INCOME
  );
  const purchaseExpenseAccount = await upsertAccount(
    "Purchase Expense A/c",
    AccountType.EXPENSE
  );
  await upsertAccount("Other Expense A/c", AccountType.OTHER_EXPENSE);
  await upsertAccount("Capital A/c", AccountType.CAPITAL);
 
  console.log("\nSeeding Journals...");
 
  await upsertJournal("Sales", JournalType.SALES, salesIncomeAccount.id);
  await upsertJournal(
    "Purchase",
    JournalType.PURCHASE,
    purchaseExpenseAccount.id
  );
  await upsertJournal("Bank", JournalType.BANK, bankAccount.id);
  await upsertJournal("Cash", JournalType.CASH, cashAccount.id);
 
  console.log("\n✅ Seed complete.");
}
 
main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
 