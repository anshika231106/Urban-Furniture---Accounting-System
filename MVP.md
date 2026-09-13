# Urban Furniture — Accounting System
## MVP Build Guideline for Coding Agents

> This document is the single source of truth for building the MVP. It is derived from
> the product spec (PDF) and the approved wireframe (Excalidraw export). Every screen,
> field, validation, and formula listed here comes directly from those two sources.
> **Do not invent fields, screens, or business rules that are not written here.** If
> something is ambiguous, flag it — do not guess silently.

---

## 0. STRICT RULES (Read First — Non-negotiable)

1. **No scope creep.** Build only what is listed in this document. Do not add extra
   modules, fields, dashboards, or "nice to have" features not specified here.
2. **Follow field names exactly** as given (e.g. `PO No.`, `Bill Reference`, `Achieved %`).
   Do not rename, abbreviate, or "improve" labels.
3. **Respect Many-to-One relationships exactly as specified.** Every place marked
   "(From X Master — Many to one)" must be a real foreign key / relational selection
   field, not free text.
4. **All computed fields must be computed, never manually editable**, unless explicitly
   stated otherwise. (e.g. `Total = Qty × Unit Price`, `Achieved % = (Achieved/Committed)*100`).
5. **State machines must be enforced in the backend**, not just the UI. E.g. a Budget in
   `Cancelled` state cannot be edited; a Journal Entry cannot be un-posted by editing lines.
6. **Debit must equal Credit** on every Journal Entry before it can be Posted. This is a
   **hard blocking validation** — do not allow Post otherwise.
7. **Budget-exceeded checks are NON-BLOCKING warnings**, not hard stops. The user must
   still be able to proceed after seeing the warning.
8. **Every transactional document (PO, Bill, SO, Invoice, Payment) must generate a
   Journal Entry automatically on confirmation** where specified — this is not optional
   and must not be left as a manual step for the user.
9. **Role-based access must be enforced server-side**, not just hidden in UI:
   - `Admin`: full access to everything.
   - `Accountant`: create/edit master data, record transactions, view reports. No user
     management.
   - `User` (Contact/Portal): can only view **their own** invoices/bills and pay their
     own dues. Cannot see other contacts' data, cannot access master data or reports.
10. **List View is the default landing view** for every master/transactional model.
    `New` opens a blank Form View. Clicking an existing row opens Form View pre-filled.
11. **Do not skip validation rules** in section 1 (auth) even for MVP/demo purposes —
    these were explicitly specified with exact character limits.
12. **All monetary values are stored and computed server-side** — never trust client-side
    totals for persistence.
13. Keep the codebase modular by domain (contacts, products, accounting, budgets,
    purchase, sales, reports, auth) — one clear module per bounded context.
14. If a spec item conflicts with normal accounting practice, **the spec wins** for MVP
    scope. Note conflicts in code comments rather than silently "fixing" them.

---

## 1. Actors & Roles

| Role | Access |
|---|---|
| **Admin** (Business Owner) | Create/Modify/Archive master data, record transactions, view reports, **create users** |
| **Accountant** (Invoicing User) | Create master data, record transactions (customers/vendors, dashboard, journal entries, invoices, bills, payments), view reports. Cannot create users. |
| **Contact User** (portal) | View only their own invoices/bills (paid/unpaid status), pay dues directly from portal. No access to master data, journals, or reports. |
| **System** | Validates data, computes taxes/totals, updates ledgers, generates reports automatically |

Note: A Contact User account is created **when a Contact master record is created** (per
spec: "Contact users can be created when creating Contact Master data").

---

## 2. Authentication Module

### 2.1 Create User (Admin only)
Fields: `Name`, `Login Id`, `E-mail Id`, `Role` (radio: User / Administrator), `Password`,
`Re-Enter Password`. Buttons: `Create`, `Cancel`.

**Validation rules (hard, blocking):**
- `Login Id`: unique, must be 6–12 characters.
- `E-mail Id`: must not be a duplicate in the database.
- `Password`: unique, must contain at least one lowercase, one uppercase, one special
  character, and be more than 8 characters long.
- `Password` and `Re-Enter Password` must match.

### 2.2 Login Page
Fields: `Login Id`, `Password`. Button: `SIGN IN`. Links: `Forgot Password`, `Sign Up`.

**Rules:**
- Check credentials against DB; match → allow login.
- If credentials do not match → show error **"Invalid Login Id or Password"**.
- Clicking **Sign Up** → lands on Sign Up page. **Only an Invoicing User (Accountant)
  account can be self-registered this way** — not Admin.
- Clicking **Forgot Password** → goes to Forgot Password page.

### 2.3 Sign Up Page
Fields: `Enter Login Id`, `Enter Email Id`, `Enter Password`, `Re-Enter Password`.
Button: `SIGN UP`.

Creates a new user record in the system with role = Invoicing User (Accountant).

**Same validation rules as Create User:**
- Login Id unique, 6–12 characters.
- Email Id not a duplicate.
- Password unique, must contain lowercase + uppercase + special char, length > 8.
- Password === Re-Enter Password.

---

## 3. App Dashboard

Tabbed layout with 4 tabs: **Sales | Purchase | Account | Report**

| Tab | Menu Items |
|---|---|
| Sales | Sales Order, Sale Invoice, Receipt |
| Purchase | Purchase Order, Purchase Bill, Payment |
| Account | Contact, Product, Analyticals, Analytical Budget, Chart of Account, Journals, Journal Entries |
| Report | Balancesheet, Profit and Loss, Budget Report |

Home dashboard cards:
- **Sales** card: `New` button + counts `All / Confirmed / Draft`
- **Purchase** card: `New` button + counts `All / Confirmed / Draft`
- **Budget Reports** card: `Report` button + counts `Achieved / Budget / Committed`

Clicking a tab item opens that model's List View.

---

## 4. Master Data Modules

**General rule for ALL master data models:** List View is default. `New` button opens a
blank Form View to create a record. Clicking an existing saved row opens Form View with
saved details. Provide a toggle between **List View** and **Kanban View** for: Contact,
Product, Analyticals (same pattern for all three).

### 4.1 Contact Master
**Form View fields:** `Contact Name`, `Email` (unique), `Phone`, `Address` (Street, City,
State, Country, Pincode), `Upload Image`.
Buttons: `New`, `Confirm`, `Back`.

**List View columns:** Select (checkbox), Image, Name, Email, Phone.
**Kanban View:** image, name, email, phone shown per card.

Type classification (from PDF): Customer / Vendor / Both — must be captured (used to
filter Vendor Name in POs and Customer Name in SOs).

### 4.2 Product Master
**Form View fields:** `Product Name`, `Product Type` (dropdown: Goods / Service / Combo),
`Category` (selection field — **must support creating new category on the fly**),
`Upload Image`, `Sales Price`, `Cost`.
Buttons: `New`, `Confirm`, `Back`.

**List View columns:** Select, Product, Category, Type, Sales Price, Cost.
**Kanban View:** image, product name, Sales Price, Cost per card.

### 4.3 Chart of Accounts (CoA)
**List View columns:** Account Name, Type.
Buttons: `New`, `Confirm`, `Archived`, `Views` (list/kanban toggle), `Back`.

**Form View (New):** `Account Name`, `Type` (dropdown selection).

**Type dropdown — grouped exactly as follows:**
- *Balance Sheet group:* Asset, Liability, Bank, Capital, Cash
- *Profit & Loss group:* Income, Expenses, Other Expenses

> Each account is assigned an Account Type, which determines how the account is treated
> and where it appears in reports (Balance Sheet vs P&L).

**Pre-seeded default accounts (must exist at setup, system-configured):**
| Account Name | Type |
|---|---|
| Bank A/c | Asset |
| Cash A/c | Asset |
| Debtors A/c | Asset |
| Creditors A/c | Liability |
| Sales Income A/c | Income |
| Purchase Expense A/c | Expense |
| Other Expense A/c | Expense |
| Capital A/c | Capital |

### 4.4 Journals
**List View columns:** Journal Name, Type, Default Account.
Buttons: `New`, `Back`.

**Form View (New):** `Journal Name` (text), `Journal Type` (selection: Sales / Purchase /
Bank / Cash), `Default Account` (selection, linked to Chart of Accounts).

**Pre-seeded default journals:**
| Journal Name | Type | Default Account |
|---|---|---|
| Sales | Sales | Sales Income A/c |
| Purchase | Purchase | Purchase Expense A/c |
| Bank | Bank | Bank A/c |
| Cash | Cash | Cash A/c |

### 4.5 Journal Entries
**List View columns:** Date, Number, Partner, Journal, Total, Status (Draft / Posted).
Buttons: `New`, `Back`.

**Form View (New):**
- Header: `Post`, `Cancel`, `Back` buttons; `Accounting Date` (date), `Journal`
  (Many-to-one selection from Journals).
- Lines table: `Account` (Many-to-one from Chart of Accounts), `Partner` (from Contact
  master), `Debit`, `Credit`.

**Field explanation (must implement exactly):**
- `Account` — Selection from Chart of Accounts (Many to one).
- `Partner` — Selection from Contact master.
- The transaction is connected through the Chart of Accounts.

**Hard blocking rule:** On clicking `Post`, if total Debit ≠ total Credit across all
lines, block the save and show a warning. Do not allow posting an unbalanced entry.

---

## 5. Analytics & Budgeting

### 5.1 Analytic Account
**Form View fields:** `Analytic Account` (name), `Type` (selection: Income / Expenses).
Buttons: `New`, `Confirm`, `Back`.
Also shown: a related list of all Budgets where this Analytic Account is used.

### 5.2 Budget
Two logical views: **Budget (Original)** and **Budget (Revised)** — a Revised budget is
a new linked record, not an edit of the original.

**Status flow (must be enforced as a strict state machine):**
`Draft → Confirm → Revised → Cancelled`

| Button | Resulting Stage | Behavior |
|---|---|---|
| `New` | Draft | Create a fresh budget |
| `Confirm` | Confirm | Confirms the newly created budget |
| `Revise` | Revised | Only visible/enabled at Confirmed stage. On click: create a **new** Budget record (new Draft) pre-filled from the original; old record moves to "Revised" status and becomes read-only with a link forward to the new revised budget. The new revised budget carries a link back to the original. |
| `Cancelled` | Cancelled | Archives the existing budget |

**Form fields:**
- `Budget Area` (auto label, e.g. "January 2026")
- `Budget Period` (Start Date, End Date)
- `Responsible` — select from Contacts created (open list of contacts on click)
- `Revised With` / `Revision Of` — link field shown only when relevant (original ↔ revised
  cross-link)
- Lines: `Analytic` (Analytic Account), `Type` (Income/Expenses — auto-mapped from
  Analytic Account), `Committed Amount`, `Achieved Amount`, `Achieved %`, `Amount to Achieve`

**Field computation rules (implement exactly, server-side):**
- `Budget Name`: alphanumeric. **On Revision, keep the original budget name and append
  the word "Revised" at the end** (e.g. "Project A Revised").
- `Type` mapping rule:
  - Analytics on **all Sales/Customer Invoice lines** → mapped with Type = Income.
  - Analytics on **all Purchase Order / Vendor Bill lines** → mapped with Type = Expenses.
- `Committed Amount`: monetary, user-entered.
- `Achieved Amount` (only visible once Budget is Confirmed):
  - For Income-type analytic: search all **Sales Invoices** with the same Analytic
    Account name, filter to the Budget Period, sum the total → set as Achieved Amount.
  - For Expense-type analytic: search all **Vendor Bills** with the same Analytic
    Account name, filter to the Budget Period, sum the total → set as Achieved Amount.
  - Clicking the Achieved Amount value opens a List View of all Invoices/Bills that share
    that analytic account for the budget period (drill-down).
- `Achieved %` (only visible for Confirmed budget):
  `Achieved % = (Achieved Amount / Committed Amount) * 100`
- `Amount to Achieve` (only visible for Confirmed budget):
  `Amount to Achieve = Committed Amount − Achieved Amount`

### 5.3 Budget Report
**List View:** Budget, Start Date, End Date, Status, Pie Chart (thumbnail).
**Kanban View:** Budget name, Start Date, End Date — click opens Form View (which is the
Budget form above).
Include a pie chart visualization (Committed vs Achieved, or similar split) per the
wireframe sketch.

---

## 6. Purchase Flow

### 6.1 Purchase Order (PO)
Buttons: `New`, `Confirm`, `Create Bill`, `Cancel`, `Back`.

**Fields:**
- `PO No.` — auto-generated sequence, `+1` of the last order (e.g. `PO0001`).
- `Vendor Name` — Many-to-one from Contact Master.
- `PO Date` — date.
- Lines: `Product` (Many-to-one, Product Master), `Budget Analytics` (Many-to-one,
  Analytic Account), `Qty` (numeric), `Unit Price` (monetary), `Total` (computed:
  `Qty × Unit Price`).
- `Total` footer = sum of line totals.

**Non-blocking warning on Confirm:** if the entered amount exceeds the remaining
budget amount for the selected Budget Analytics line → show warning:
> "⚠ Exceeds Approved Budget — The entered amount is higher than the remaining budget
> amount for this budget line. Consider adjusting the value or revise the budget."
This must **not** block confirmation.

`Create Bill` generates a Vendor Bill pre-filled from this PO (vendor name, product,
price, quantity carried over).

### 6.2 Vendor Bill
Can originate from a PO (fields pre-filled and PO link shown) **or** be created fresh
(no PO link shown in that case).

Buttons: `New`, `Confirm`, `Pay`, `PO` (link back — only if bill was created from a PO),
`Budget` (opens the Budget/Analytic Report used by the bill), `Cancel`, `Back`.

**Fields:**
- `Vendor Bill No.` — auto-generated (`Bill/2026/0001` style).
- `Bill Reference` — alphanumeric free text.
- `Vendor Name` — Many-to-one from Contact Master (carried from PO if applicable).
- `Bill Date`, `Due Date` — dates.
- `Status` — computed, one of `Paid` / `Partial` / `Not Paid` (see logic below).
- Lines: `Product` (Product Master M2O), `Chart of Account` (**defaults to Purchase
  account by default**), `Budget Analytics` (Analytic Account M2O), `Qty`, `Unit Price`,
  `Total`.
- Footer: `Total`, `Paid Via Cash`, `Paid Via Bank`, `Amount Due` (computed:
  `Total − Amount Paid`).

**Status computation logic:**
| Status | Condition |
|---|---|
| Paid | Amount Due = 0 |
| Partial | Amount Due < Bill Total (and > 0) |
| Not Paid | Amount Due = Bill Total |

**Non-blocking warning on Confirm** (same as PO): "Exceeds Approved Budget" if amount
exceeds remaining budget for the line's Budget Analytics.

`Pay` button opens the Bill Payment form.

**On Confirm, this must auto-generate the corresponding Journal Entry** (Debit: Purchase
Expense A/c or relevant account, Credit: Creditors A/c) — see Section 8.

### 6.3 Bill Payment
Buttons: `Confirm`, `Cancel`, gear/settings icon (options: `Print`, `Send` via mail).
Status flow: `Draft → Confirm → Cancelled`.

**Fields:**
- `Payment Type` — radio: `Send` / `Receive` (Bill payment defaults to `Send`).
- `Partner` — auto-filled from vendor on the Bill.
- `Amount` — auto-filled from the Bill's due amount.
- `Date` — defaults to today's date.
- `Payment Via` — defaults to Bank (or selected from Cash/Bank).
- `Note` — alphanumeric, optional.

Clicking `Pay` on the Bill navigates here. **On Confirm, this must auto-generate a
Journal Entry** (Debit: Creditors A/c, Credit: Bank/Cash A/c) and update the Bill's
Amount Due / Status.

---

## 7. Sales Flow

The Sales flow **mirrors the Purchase flow exactly**, with these substitutions:

### 7.1 Sales Order (SO)
Same structure as Purchase Order:
- `SO No.` — auto-generated sequence.
- `Customer Name` — Many-to-one from Contact Master.
- `SO Date`.
- Lines: `Product`, `Budget Analytics`, `Qty`, `Unit Price`, `Total`.
Buttons: `New`, `Confirm`, `Create Invoice`, `Cancel`, `Back`.

`Create Invoice` generates a Customer Invoice pre-filled from this SO.

### 7.2 Customer Invoice
Same structure as Vendor Bill:
- `Customer Invoice No.`, `Invoice Reference`, `Customer Name`, `Invoice Date`,
  `Due Date`, `Status` (Paid/Partial/Not Paid — same logic as Bill).
- Lines: `Product`, `Chart of Account` (**defaults to Sales account**), `Budget
  Analytics`, `Qty`, `Unit Price`, `Total`.
Buttons: `New`, `Confirm`, `Pay`, `SO` (link back if created from SO), `Budget`, `Cancel`,
`Back`.

**On Confirm, auto-generate Journal Entry** (Debit: Debtors A/c, Credit: Sales Income
A/c).

### 7.3 Invoice Payment (Receipt)
Same structure as Bill Payment, but `Payment Type` defaults to `Receive`.
- `Partner`, `Amount` auto-filled from invoice.
- `Date`, `Payment Via`, `Note`.

**On Confirm, auto-generate Journal Entry** (Debit: Bank/Cash A/c, Credit: Debtors A/c)
and update Invoice's Amount Due / Status.

---

## 8. Automatic Journal Entry Generation (System Rule)

This is a core system responsibility — **every confirmed transactional document must
create a balanced Journal Entry automatically**, using the Chart of Accounts linkage:

| Document Confirmed | Debit | Credit |
|---|---|---|
| Vendor Bill | Purchase Expense A/c (or line's Chart of Account) | Creditors A/c |
| Bill Payment | Creditors A/c | Bank A/c or Cash A/c |
| Customer Invoice | Debtors A/c | Sales Income A/c |
| Invoice Payment (Receipt) | Bank A/c or Cash A/c | Debtors A/c |

All such entries appear in the **Journal Entries** list with Status = Posted, and must
satisfy the debit = credit rule automatically (system-generated, so this should never
fail — but validate anyway).

---

## 9. Reports

All reports must be computed **live from posted Journal Entries / Chart of Account
balances** — do not hardcode or cache stale values.

### 9.1 Profit and Loss Report
Buttons: `Print` (PDF download on click), year selector (e.g. `2026`), `Back`.

**Field computation (exact):**
| Field | Formula |
|---|---|
| Income | Total of Income |
| Income From Sales | Total of account type Income |
| Expenses | Total of All expenses |
| Purchase Expense | Total of account type Expense |
| Other Expense | Total of account type Other Expense |
| Net Income | Income − Expenses |

### 9.2 Balance Sheet
Buttons: `Print`, year selector, `Back`.
Two columns: **Assets** and **Liabilities**.

**Field computation (exact):**
| Row | Column | Source |
|---|---|---|
| Bank | Assets | Account type Asset − Bank |
| Cash | Assets | Account type Asset − Cash |
| Debtors | Assets | Account type Asset − Debtors |
| Creditors | Liabilities | Account type Liability − Creditors |
| Capital | Liabilities | Account type Capital |

Must show `Total Assets` and `Total Liability` footer, and these must balance
(Assets = Liabilities + Capital) as a sanity check in dev/testing — flag if they don't.

### 9.3 Budget Report
As described in Section 5.3 — list/kanban of all budgets with pie-chart visualization
and drill-through to each Budget's Form View.

---

## 10. Data Model Summary (Entities & Key Relationships)

```
User (role: Admin | Accountant | ContactUser)
Contact (name, email, phone, address, image, type: Customer/Vendor/Both) 1---* linked User (portal)
Product (name, type: Goods/Service/Combo, category, sales_price, cost, image)
ChartOfAccount (name, type: Asset/Liability/Bank/Capital/Cash/Income/Expenses/OtherExpenses)
Journal (name, type: Sales/Purchase/Bank/Cash, default_account -> ChartOfAccount)
JournalEntry (date, number, journal -> Journal, status: Draft/Posted)
  JournalEntryLine (account -> ChartOfAccount, partner -> Contact, debit, credit)
AnalyticAccount (name, type: Income/Expenses)
Budget (name, period_start, period_end, responsible -> Contact, status: Draft/Confirm/Revised/Cancelled,
        revision_of -> Budget (nullable, self-referential))
  BudgetLine (analytic -> AnalyticAccount, type, committed_amount, achieved_amount[computed],
              achieved_pct[computed], amount_to_achieve[computed])
PurchaseOrder (po_no, vendor -> Contact, po_date, status: Draft/Confirmed/Cancelled)
  PurchaseOrderLine (product -> Product, analytic -> AnalyticAccount, qty, unit_price, total[computed])
VendorBill (bill_no, bill_reference, vendor -> Contact, bill_date, due_date,
            po -> PurchaseOrder (nullable), status[computed: Paid/Partial/NotPaid])
  VendorBillLine (product -> Product, account -> ChartOfAccount, analytic -> AnalyticAccount,
                  qty, unit_price, total[computed])
BillPayment (payment_type: Send/Receive, partner -> Contact, bill -> VendorBill, amount, date,
             payment_via: Cash/Bank, note, status: Draft/Confirm/Cancelled)
SalesOrder (so_no, customer -> Contact, so_date, status: Draft/Confirmed/Cancelled)
  SalesOrderLine (product -> Product, analytic -> AnalyticAccount, qty, unit_price, total[computed])
CustomerInvoice (invoice_no, invoice_reference, customer -> Contact, invoice_date, due_date,
                 so -> SalesOrder (nullable), status[computed: Paid/Partial/NotPaid])
  CustomerInvoiceLine (product -> Product, account -> ChartOfAccount, analytic -> AnalyticAccount,
                       qty, unit_price, total[computed])
InvoicePayment (payment_type: Send/Receive, partner -> Contact, invoice -> CustomerInvoice, amount,
                date, payment_via: Cash/Bank, note, status: Draft/Confirm/Cancelled)
```

---

## 11. MVP Build Order (Follow This Sequence)

**Do not reorder these phases.** Each phase depends on the previous one's data model.

### Phase 1 — Foundation
- [ ] User model + auth (Create User, Login, Sign Up, Forgot Password) with exact
      validation rules from Section 2.
- [ ] Role-based access middleware (Admin / Accountant / Contact User).
- [ ] App shell with 4-tab dashboard (Section 3).

### Phase 2 — Master Data
- [ ] Contact Master (Form, List, Kanban).
- [ ] Product Master (Form, List, Kanban) — with on-the-fly category creation.
- [ ] Chart of Accounts (seed defaults from Section 4.3, Form, List).
- [ ] Journals (seed 4 defaults from Section 4.4, Form, List).
- [ ] Analytic Account (Form, List).

### Phase 3 — Core Ledger
- [ ] Journal Entries (Form with lines, Post/Cancel, debit=credit blocking validation).
- [ ] Confirm this works standalone via manual entry before wiring automatic generation.

### Phase 4 — Budgeting
- [ ] Budget model + state machine (Draft/Confirm/Revise/Cancelled).
- [ ] Achieved Amount / Achieved % / Amount to Achieve computation logic.
- [ ] Budget Report (List/Kanban + pie chart + drill-down).

### Phase 5 — Purchase Flow
- [ ] Purchase Order → Confirm → Create Bill.
- [ ] Vendor Bill → Confirm (auto Journal Entry) → Pay.
- [ ] Bill Payment → Confirm (auto Journal Entry, update Bill status).
- [ ] Non-blocking budget-exceeded warnings on PO/Bill confirm.

### Phase 6 — Sales Flow
- [ ] Sales Order → Confirm → Create Invoice.
- [ ] Customer Invoice → Confirm (auto Journal Entry) → Pay.
- [ ] Invoice Payment → Confirm (auto Journal Entry, update Invoice status).

### Phase 7 — Reports
- [ ] Profit & Loss Report (computed live, Print/PDF).
- [ ] Balance Sheet (computed live, Print/PDF).
- [ ] Verify Balance Sheet balances (Assets = Liabilities + Capital) using seeded demo
      data as a sanity test.

### Phase 8 — Contact Portal
- [ ] Contact User login view: list of their own invoices/bills with paid/unpaid status.
- [ ] Direct pay action from portal (wired to same Payment flow, restricted to own
      records only).

---

## 12. Definition of Done (MVP Acceptance Checklist)

- [ ] A user can sign up, log in, and see the role-appropriate dashboard.
- [ ] Admin can create an Accountant user; validation rules are enforced.
- [ ] All 5 master data modules (Contact, Product, CoA, Journals, Analytic Accounts) can
      be created, listed, and edited exactly per their field spec.
- [ ] A manually created Journal Entry with unequal debit/credit is blocked from posting.
- [ ] A Budget can be created, confirmed, and its Achieved Amount correctly pulls from
      matching Sales Invoices / Vendor Bills within its period.
- [ ] Revising a Confirmed Budget creates a correctly linked new record and marks the old
      one Revised.
- [ ] Full Purchase cycle (PO → Bill → Payment) works end-to-end and produces correct,
      balanced Journal Entries at each step.
- [ ] Full Sales cycle (SO → Invoice → Receipt) works end-to-end and produces correct,
      balanced Journal Entries at each step.
- [ ] Budget-exceeded warning appears but does not block confirmation on PO/Bill.
- [ ] Bill/Invoice status (Paid/Partial/Not Paid) updates correctly after partial and
      full payments.
- [ ] Profit & Loss and Balance Sheet reports compute correctly from a full demo dataset
      and the Balance Sheet balances.
- [ ] A Contact User can log in and see only their own invoices/bills, and can pay them.
- [ ] No role can access data or actions outside their permission set (verified via
      direct API calls, not just UI hiding).

---

## 13. Explicitly Out of Scope for MVP

(Not mentioned anywhere in the spec/wireframe — do not build these)
- Multi-currency support
- Tax computation engine (tax field appears only once, on Sales Order, in the PDF text —
  treat as a placeholder field only, not a computed tax engine, unless later clarified)
- Multi-company / multi-warehouse support
- Inventory/stock movement tracking beyond what's needed for product master
- Recurring invoices/subscriptions
- Any notification system beyond the "Send" (email) option on Payments
- Approval workflows beyond the Draft/Confirm/Post/Cancel states specified
