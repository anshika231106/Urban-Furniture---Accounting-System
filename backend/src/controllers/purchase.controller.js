import { prisma } from '../lib/prisma.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDecimal(val) {
  return Number(val || 0);
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

async function getNextPONumber() {
  const count = await prisma.purchaseOrder.count();
  const nextNum = count + 1;
  return `PO${String(nextNum).padStart(4, '0')}`;
}

async function getNextBillNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.vendorBill.count();
  const nextNum = count + 1;
  return `Bill/${year}/${String(nextNum).padStart(4, '0')}`;
}

async function getNextJournalEntryNumber(prefix = 'PURC') {
  const year = new Date().getFullYear();
  const count = await prisma.journalEntry.count();
  const nextNum = count + 1;
  return `${prefix}/${year}/${String(nextNum).padStart(4, '0')}`;
}

/**
 * Check budget limits for analytic accounts in lines (non-blocking warning).
 */
async function checkBudgetWarning(lines, docDate) {
  const dateObj = docDate ? new Date(docDate) : new Date();

  for (const line of lines) {
    if (!line.analyticAccountId) continue;

    // Find active budget that covers this date and contains this analytic account
    const budgetLine = await prisma.budgetLine.findFirst({
      where: {
        analyticAccountId: line.analyticAccountId,
        type: 'EXPENSE',
        budget: {
          status: 'CONFIRMED',
          startDate: { lte: dateObj },
          endDate: { gte: dateObj },
        },
      },
      include: {
        budget: true,
        analyticAccount: true,
      },
    });

    if (budgetLine) {
      const committed = Number(budgetLine.committedAmount || 0);
      const lineTotal = Number(line.total || 0);

      // Sum existing confirmed vendor bill lines for this analytic account within period
      const existingBills = await prisma.vendorBillLine.findMany({
        where: {
          analyticAccountId: line.analyticAccountId,
          vendorBill: {
            status: 'CONFIRMED',
            billDate: {
              gte: budgetLine.budget.startDate,
              lte: budgetLine.budget.endDate,
            },
          },
        },
      });

      const spentSoFar = existingBills.reduce((sum, b) => sum + Number(b.total || 0), 0);
      if (spentSoFar + lineTotal > committed) {
        return `⚠ Exceeds Approved Budget — The entered amount ($${(spentSoFar + lineTotal).toFixed(2)}) is higher than the approved budget ($${committed.toFixed(2)}) for "${budgetLine.analyticAccount.name}". Consider adjusting the value or revise the budget.`;
      }
    }
  }

  return null;
}

// ── Option Endpoints ─────────────────────────────────────────────────────────

export async function getPurchaseOptions(req, res) {
  try {
    const [vendors, products, accounts, analytics] = await Promise.all([
      prisma.contact.findMany({
        where: { archived: false, type: { in: ['VENDOR', 'BOTH'] } },
        orderBy: { name: 'asc' },
      }),
      prisma.product.findMany({
        where: { archived: false },
        include: { category: true },
        orderBy: { name: 'asc' },
      }),
      prisma.account.findMany({
        where: { archived: false },
        orderBy: { name: 'asc' },
      }),
      prisma.analyticAccount.findMany({
        orderBy: { name: 'asc' },
      }),
    ]);

    const defaultPurchaseAccount = accounts.find((a) => a.name === 'Purchase Expense A/c') || accounts.find((a) => a.type === 'EXPENSE') || null;

    res.json({
      vendors: vendors.map((v) => ({
        id: v.id,
        name: v.name,
        email: v.email,
        phone: v.phone || '',
      })),
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: p.category ? p.category.name : '',
        salesPrice: formatDecimal(p.salesPrice),
        cost: formatDecimal(p.cost),
      })),
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
      })),
      analytics: analytics.map((an) => ({
        id: an.id,
        name: an.name,
        type: an.type,
      })),
      defaultPurchaseAccountId: defaultPurchaseAccount ? defaultPurchaseAccount.id : '',
    });
  } catch (err) {
    console.error('getPurchaseOptions error:', err);
    res.status(500).json({ error: 'Failed to load purchase form options.' });
  }
}

// ── Purchase Orders ──────────────────────────────────────────────────────────

export async function getPurchaseOrders(req, res) {
  try {
    const { status } = req.query;
    const where = {};
    if (status) {
      where.status = status.toUpperCase();
    }

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: true,
        lines: {
          include: {
            product: true,
            analyticAccount: true,
          },
        },
      },
      orderBy: { poDate: 'desc' },
    });

    const formatted = orders.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      vendorId: po.vendorId,
      vendorName: po.vendor?.name || '',
      poDate: formatDate(po.poDate),
      status: po.status,
      total: formatDecimal(po.total),
      linesCount: po.lines.length,
      lines: po.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productName: l.product?.name || '',
        analyticAccountId: l.analyticAccountId || '',
        analyticAccountName: l.analyticAccount?.name || '',
        qty: formatDecimal(l.qty),
        unitPrice: formatDecimal(l.unitPrice),
        total: formatDecimal(l.total),
      })),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('getPurchaseOrders error:', err);
    res.status(500).json({ error: 'Failed to fetch purchase orders.' });
  }
}

export async function getPurchaseOrderById(req, res) {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        bills: true,
        lines: {
          include: {
            product: true,
            analyticAccount: true,
          },
        },
      },
    });

    if (!po) return res.status(404).json({ error: 'Purchase Order not found.' });

    res.json({
      id: po.id,
      poNumber: po.poNumber,
      vendorId: po.vendorId,
      vendorName: po.vendor?.name || '',
      poDate: formatDate(po.poDate),
      status: po.status,
      total: formatDecimal(po.total),
      bills: po.bills.map((b) => ({
        id: b.id,
        billNumber: b.billNumber,
        status: b.status,
      })),
      lines: po.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productName: l.product?.name || '',
        analyticAccountId: l.analyticAccountId || '',
        analyticAccountName: l.analyticAccount?.name || '',
        qty: formatDecimal(l.qty),
        unitPrice: formatDecimal(l.unitPrice),
        total: formatDecimal(l.total),
      })),
    });
  } catch (err) {
    console.error('getPurchaseOrderById error:', err);
    res.status(500).json({ error: 'Failed to fetch purchase order.' });
  }
}

export async function createPurchaseOrder(req, res) {
  try {
    const { vendorId, poDate, lines = [] } = req.body;
    if (!vendorId) return res.status(400).json({ error: 'Vendor is required.' });
    if (!poDate) return res.status(400).json({ error: 'PO Date is required.' });
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'At least one line item is required.' });
    }

    const poNumber = await getNextPONumber();

    // Compute lines
    let computedTotal = 0;
    const computedLines = lines.map((l) => {
      const qty = Math.max(1, Number(l.qty) || 1);
      const unitPrice = Math.max(0, Number(l.unitPrice) || 0);
      const total = Number((qty * unitPrice).toFixed(2));
      computedTotal += total;
      return {
        productId: l.productId,
        analyticAccountId: l.analyticAccountId || null,
        qty,
        unitPrice,
        total,
      };
    });

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        vendorId,
        poDate: new Date(poDate),
        status: 'DRAFT',
        total: computedTotal,
        lines: {
          create: computedLines,
        },
      },
      include: {
        vendor: true,
        lines: {
          include: {
            product: true,
            analyticAccount: true,
          },
        },
      },
    });

    res.status(201).json({
      id: po.id,
      poNumber: po.poNumber,
      vendorId: po.vendorId,
      vendorName: po.vendor?.name || '',
      poDate: formatDate(po.poDate),
      status: po.status,
      total: formatDecimal(po.total),
      lines: po.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productName: l.product?.name || '',
        analyticAccountId: l.analyticAccountId || '',
        analyticAccountName: l.analyticAccount?.name || '',
        qty: formatDecimal(l.qty),
        unitPrice: formatDecimal(l.unitPrice),
        total: formatDecimal(l.total),
      })),
    });
  } catch (err) {
    console.error('createPurchaseOrder error:', err);
    res.status(500).json({ error: 'Failed to create purchase order.' });
  }
}

export async function updatePurchaseOrder(req, res) {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) return res.status(404).json({ error: 'Purchase Order not found.' });
    if (po.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only Draft Purchase Orders can be edited.' });
    }

    const { vendorId, poDate, lines = [] } = req.body;
    let computedTotal = 0;
    const computedLines = lines.map((l) => {
      const qty = Math.max(1, Number(l.qty) || 1);
      const unitPrice = Math.max(0, Number(l.unitPrice) || 0);
      const total = Number((qty * unitPrice).toFixed(2));
      computedTotal += total;
      return {
        productId: l.productId,
        analyticAccountId: l.analyticAccountId || null,
        qty,
        unitPrice,
        total,
      };
    });

    // Delete old lines & recreate
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        vendorId: vendorId || po.vendorId,
        poDate: poDate ? new Date(poDate) : po.poDate,
        total: computedTotal,
        lines: {
          create: computedLines,
        },
      },
      include: {
        vendor: true,
        lines: {
          include: {
            product: true,
            analyticAccount: true,
          },
        },
      },
    });

    res.json({
      id: updated.id,
      poNumber: updated.poNumber,
      vendorId: updated.vendorId,
      vendorName: updated.vendor?.name || '',
      poDate: formatDate(updated.poDate),
      status: updated.status,
      total: formatDecimal(updated.total),
      lines: updated.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productName: l.product?.name || '',
        analyticAccountId: l.analyticAccountId || '',
        analyticAccountName: l.analyticAccount?.name || '',
        qty: formatDecimal(l.qty),
        unitPrice: formatDecimal(l.unitPrice),
        total: formatDecimal(l.total),
      })),
    });
  } catch (err) {
    console.error('updatePurchaseOrder error:', err);
    res.status(500).json({ error: 'Failed to update purchase order.' });
  }
}

export async function confirmPurchaseOrder(req, res) {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!po) return res.status(404).json({ error: 'Purchase Order not found.' });
    if (po.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only Draft Purchase Orders can be confirmed.' });
    }

    // Check non-blocking budget warning
    const budgetWarning = await checkBudgetWarning(po.lines, po.poDate);

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });

    res.json({
      message: 'Purchase Order confirmed successfully.',
      status: updated.status,
      warning: budgetWarning,
    });
  } catch (err) {
    console.error('confirmPurchaseOrder error:', err);
    res.status(500).json({ error: 'Failed to confirm purchase order.' });
  }
}

export async function cancelPurchaseOrder(req, res) {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) return res.status(404).json({ error: 'Purchase Order not found.' });

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Purchase Order cancelled.', status: updated.status });
  } catch (err) {
    console.error('cancelPurchaseOrder error:', err);
    res.status(500).json({ error: 'Failed to cancel purchase order.' });
  }
}

export async function createBillFromPO(req, res) {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        lines: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!po) return res.status(404).json({ error: 'Purchase Order not found.' });
    if (po.status !== 'CONFIRMED') {
      return res.status(400).json({ error: 'Can only create a Bill from a Confirmed Purchase Order.' });
    }

    // Default account for purchase expense
    const purchaseAccount = await prisma.account.findFirst({
      where: { name: 'Purchase Expense A/c' },
    }) || await prisma.account.findFirst({
      where: { type: 'EXPENSE' },
    });

    if (!purchaseAccount) {
      return res.status(400).json({ error: 'No default Purchase Expense account found in Chart of Accounts.' });
    }

    const billNumber = await getNextBillNumber();
    const computedTotal = Number(po.total || 0);

    const bill = await prisma.vendorBill.create({
      data: {
        billNumber,
        reference: `PO Ref: ${po.poNumber}`,
        vendorId: po.vendorId,
        purchaseOrderId: po.id,
        billDate: new Date(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // +15 days
        status: 'DRAFT',
        paymentStatus: 'NOT_PAID',
        total: computedTotal,
        amountDue: computedTotal,
        lines: {
          create: po.lines.map((l) => ({
            productId: l.productId,
            accountId: purchaseAccount.id,
            analyticAccountId: l.analyticAccountId,
            qty: l.qty,
            unitPrice: l.unitPrice,
            total: l.total,
          })),
        },
      },
      include: {
        lines: true,
      },
    });

    res.status(201).json({
      message: 'Vendor Bill created from Purchase Order.',
      billId: bill.id,
      billNumber: bill.billNumber,
    });
  } catch (err) {
    console.error('createBillFromPO error:', err);
    res.status(500).json({ error: 'Failed to create bill from purchase order.' });
  }
}

// ── Vendor Bills ─────────────────────────────────────────────────────────────

export async function getVendorBills(req, res) {
  try {
    const { status, paymentStatus } = req.query;
    const where = {};
    if (status) where.status = status.toUpperCase();
    if (paymentStatus) where.paymentStatus = paymentStatus.toUpperCase();

    const bills = await prisma.vendorBill.findMany({
      where,
      include: {
        vendor: true,
        purchaseOrder: true,
        payments: true,
        lines: {
          include: {
            product: true,
            account: true,
            analyticAccount: true,
          },
        },
      },
      orderBy: { billDate: 'desc' },
    });

    const formatted = bills.map((b) => {
      const paidViaCash = b.payments
        .filter((p) => p.status === 'CONFIRMED' && p.paymentVia === 'CASH')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const paidViaBank = b.payments
        .filter((p) => p.status === 'CONFIRMED' && p.paymentVia === 'BANK')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      return {
        id: b.id,
        billNumber: b.billNumber,
        reference: b.reference || '',
        vendorId: b.vendorId,
        vendorName: b.vendor?.name || '',
        billDate: formatDate(b.billDate),
        dueDate: formatDate(b.dueDate),
        purchaseOrderId: b.purchaseOrderId || null,
        poNumber: b.purchaseOrder?.poNumber || '',
        status: b.status,
        paymentStatus: b.paymentStatus,
        total: formatDecimal(b.total),
        amountDue: formatDecimal(b.amountDue),
        paidViaCash,
        paidViaBank,
        linesCount: b.lines.length,
        lines: b.lines.map((l) => ({
          id: l.id,
          productId: l.productId || '',
          productName: l.product?.name || '',
          accountId: l.accountId,
          accountName: l.account?.name || '',
          analyticAccountId: l.analyticAccountId || '',
          analyticAccountName: l.analyticAccount?.name || '',
          qty: formatDecimal(l.qty),
          unitPrice: formatDecimal(l.unitPrice),
          total: formatDecimal(l.total),
        })),
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('getVendorBills error:', err);
    res.status(500).json({ error: 'Failed to fetch vendor bills.' });
  }
}

export async function getVendorBillById(req, res) {
  try {
    const { id } = req.params;
    const b = await prisma.vendorBill.findUnique({
      where: { id },
      include: {
        vendor: true,
        purchaseOrder: true,
        payments: {
          include: { partner: true },
          orderBy: { date: 'desc' },
        },
        lines: {
          include: {
            product: true,
            account: true,
            analyticAccount: true,
          },
        },
      },
    });

    if (!b) return res.status(404).json({ error: 'Vendor Bill not found.' });

    const paidViaCash = b.payments
      .filter((p) => p.status === 'CONFIRMED' && p.paymentVia === 'CASH')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const paidViaBank = b.payments
      .filter((p) => p.status === 'CONFIRMED' && p.paymentVia === 'BANK')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    res.json({
      id: b.id,
      billNumber: b.billNumber,
      reference: b.reference || '',
      vendorId: b.vendorId,
      vendorName: b.vendor?.name || '',
      billDate: formatDate(b.billDate),
      dueDate: formatDate(b.dueDate),
      purchaseOrderId: b.purchaseOrderId || null,
      poNumber: b.purchaseOrder?.poNumber || '',
      status: b.status,
      paymentStatus: b.paymentStatus,
      total: formatDecimal(b.total),
      amountDue: formatDecimal(b.amountDue),
      paidViaCash,
      paidViaBank,
      payments: b.payments.map((p) => ({
        id: p.id,
        amount: formatDecimal(p.amount),
        date: formatDate(p.date),
        paymentVia: p.paymentVia,
        status: p.status,
        note: p.note || '',
      })),
      lines: b.lines.map((l) => ({
        id: l.id,
        productId: l.productId || '',
        productName: l.product?.name || '',
        accountId: l.accountId,
        accountName: l.account?.name || '',
        analyticAccountId: l.analyticAccountId || '',
        analyticAccountName: l.analyticAccount?.name || '',
        qty: formatDecimal(l.qty),
        unitPrice: formatDecimal(l.unitPrice),
        total: formatDecimal(l.total),
      })),
    });
  } catch (err) {
    console.error('getVendorBillById error:', err);
    res.status(500).json({ error: 'Failed to fetch vendor bill.' });
  }
}

export async function createVendorBill(req, res) {
  try {
    const { vendorId, reference, billDate, dueDate, lines = [] } = req.body;
    if (!vendorId) return res.status(400).json({ error: 'Vendor is required.' });
    if (!billDate) return res.status(400).json({ error: 'Bill Date is required.' });
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'At least one line item is required.' });
    }

    const defaultAccount = await prisma.account.findFirst({
      where: { name: 'Purchase Expense A/c' },
    }) || await prisma.account.findFirst({
      where: { type: 'EXPENSE' },
    });

    const billNumber = await getNextBillNumber();

    let computedTotal = 0;
    const computedLines = lines.map((l) => {
      const qty = Math.max(1, Number(l.qty) || 1);
      const unitPrice = Math.max(0, Number(l.unitPrice) || 0);
      const total = Number((qty * unitPrice).toFixed(2));
      computedTotal += total;
      return {
        productId: l.productId || null,
        accountId: l.accountId || (defaultAccount ? defaultAccount.id : null),
        analyticAccountId: l.analyticAccountId || null,
        qty,
        unitPrice,
        total,
      };
    });

    const bill = await prisma.vendorBill.create({
      data: {
        billNumber,
        reference: reference ? reference.trim() : null,
        vendorId,
        billDate: new Date(billDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'DRAFT',
        paymentStatus: 'NOT_PAID',
        total: computedTotal,
        amountDue: computedTotal,
        lines: {
          create: computedLines,
        },
      },
      include: {
        vendor: true,
        lines: {
          include: {
            product: true,
            account: true,
            analyticAccount: true,
          },
        },
      },
    });

    res.status(201).json({
      id: bill.id,
      billNumber: bill.billNumber,
      reference: bill.reference || '',
      vendorId: bill.vendorId,
      vendorName: bill.vendor?.name || '',
      billDate: formatDate(bill.billDate),
      dueDate: formatDate(bill.dueDate),
      status: bill.status,
      paymentStatus: bill.paymentStatus,
      total: formatDecimal(bill.total),
      amountDue: formatDecimal(bill.amountDue),
      lines: bill.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productName: l.product?.name || '',
        accountId: l.accountId,
        accountName: l.account?.name || '',
        analyticAccountId: l.analyticAccountId || '',
        analyticAccountName: l.analyticAccount?.name || '',
        qty: formatDecimal(l.qty),
        unitPrice: formatDecimal(l.unitPrice),
        total: formatDecimal(l.total),
      })),
    });
  } catch (err) {
    console.error('createVendorBill error:', err);
    res.status(500).json({ error: 'Failed to create vendor bill.' });
  }
}

export async function updateVendorBill(req, res) {
  try {
    const { id } = req.params;
    const bill = await prisma.vendorBill.findUnique({ where: { id } });
    if (!bill) return res.status(404).json({ error: 'Vendor Bill not found.' });
    if (bill.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only Draft Vendor Bills can be edited.' });
    }

    const { vendorId, reference, billDate, dueDate, lines = [] } = req.body;

    const defaultAccount = await prisma.account.findFirst({
      where: { name: 'Purchase Expense A/c' },
    }) || await prisma.account.findFirst({
      where: { type: 'EXPENSE' },
    });

    let computedTotal = 0;
    const computedLines = lines.map((l) => {
      const qty = Math.max(1, Number(l.qty) || 1);
      const unitPrice = Math.max(0, Number(l.unitPrice) || 0);
      const total = Number((qty * unitPrice).toFixed(2));
      computedTotal += total;
      return {
        productId: l.productId || null,
        accountId: l.accountId || (defaultAccount ? defaultAccount.id : null),
        analyticAccountId: l.analyticAccountId || null,
        qty,
        unitPrice,
        total,
      };
    });

    await prisma.vendorBillLine.deleteMany({ where: { vendorBillId: id } });

    const updated = await prisma.vendorBill.update({
      where: { id },
      data: {
        vendorId: vendorId || bill.vendorId,
        reference: reference !== undefined ? reference.trim() : bill.reference,
        billDate: billDate ? new Date(billDate) : bill.billDate,
        dueDate: dueDate ? new Date(dueDate) : bill.dueDate,
        total: computedTotal,
        amountDue: computedTotal,
        lines: {
          create: computedLines,
        },
      },
      include: {
        vendor: true,
        lines: {
          include: {
            product: true,
            account: true,
            analyticAccount: true,
          },
        },
      },
    });

    res.json({
      id: updated.id,
      billNumber: updated.billNumber,
      reference: updated.reference || '',
      vendorId: updated.vendorId,
      vendorName: updated.vendor?.name || '',
      billDate: formatDate(updated.billDate),
      dueDate: formatDate(updated.dueDate),
      status: updated.status,
      paymentStatus: updated.paymentStatus,
      total: formatDecimal(updated.total),
      amountDue: formatDecimal(updated.amountDue),
      lines: updated.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productName: l.product?.name || '',
        accountId: l.accountId,
        accountName: l.account?.name || '',
        analyticAccountId: l.analyticAccountId || '',
        analyticAccountName: l.analyticAccount?.name || '',
        qty: formatDecimal(l.qty),
        unitPrice: formatDecimal(l.unitPrice),
        total: formatDecimal(l.total),
      })),
    });
  } catch (err) {
    console.error('updateVendorBill error:', err);
    res.status(500).json({ error: 'Failed to update vendor bill.' });
  }
}

/**
 * Confirm Vendor Bill:
 * 1. Checks budget warnings (non-blocking)
 * 2. Marks status = CONFIRMED
 * 3. Auto-generates balanced Journal Entry:
 *    Debit: Line Account (Purchase Expense A/c)
 *    Credit: Creditors A/c
 */
export async function confirmVendorBill(req, res) {
  try {
    const { id } = req.params;
    const bill = await prisma.vendorBill.findUnique({
      where: { id },
      include: {
        lines: {
          include: { account: true },
        },
        vendor: true,
      },
    });

    if (!bill) return res.status(404).json({ error: 'Vendor Bill not found.' });
    if (bill.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only Draft Vendor Bills can be confirmed.' });
    }

    const budgetWarning = await checkBudgetWarning(bill.lines, bill.billDate);

    // Find Purchase Journal
    let purchaseJournal = await prisma.journal.findFirst({
      where: { type: 'PURCHASE' },
    });
    if (!purchaseJournal) {
      purchaseJournal = await prisma.journal.findFirst();
    }

    // Find Creditors Account
    const creditorsAccount = await prisma.account.findFirst({
      where: { name: 'Creditors A/c' },
    }) || await prisma.account.findFirst({
      where: { type: 'LIABILITY' },
    });

    if (!creditorsAccount) {
      return res.status(400).json({ error: 'No Creditors account found for Journal Entry generation.' });
    }

    const totalAmount = Number(bill.total || 0);

    // Prepare journal entry lines
    const jeLines = [];

    // Debit line per bill line
    for (const line of bill.lines) {
      const lineAmt = Number(line.total || 0);
      jeLines.push({
        accountId: line.accountId,
        partnerId: bill.vendorId,
        debit: lineAmt,
        credit: 0,
      });
    }

    // Credit line to Creditors A/c
    jeLines.push({
      accountId: creditorsAccount.id,
      partnerId: bill.vendorId,
      debit: 0,
      credit: totalAmount,
    });

    const jeNumber = await getNextJournalEntryNumber('PURC');

    // Run in transaction: update bill + create journal entry
    const result = await prisma.$transaction(async (tx) => {
      const je = await tx.journalEntry.create({
        data: {
          journalId: purchaseJournal.id,
          date: bill.billDate,
          number: jeNumber,
          total: totalAmount,
          status: 'POSTED',
          sourceType: 'VENDOR_BILL',
          vendorBillId: bill.id,
          lines: {
            create: jeLines,
          },
        },
      });

      const updatedBill = await tx.vendorBill.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
        },
      });

      return { updatedBill, je };
    });

    res.json({
      message: 'Vendor Bill confirmed and Journal Entry posted.',
      status: result.updatedBill.status,
      paymentStatus: result.updatedBill.paymentStatus,
      journalEntryNumber: result.je.number,
      warning: budgetWarning,
    });
  } catch (err) {
    console.error('confirmVendorBill error:', err);
    res.status(500).json({ error: err.message || 'Failed to confirm vendor bill.' });
  }
}

export async function cancelVendorBill(req, res) {
  try {
    const { id } = req.params;
    const bill = await prisma.vendorBill.findUnique({ where: { id } });
    if (!bill) return res.status(404).json({ error: 'Vendor Bill not found.' });

    const updated = await prisma.vendorBill.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Vendor Bill cancelled.', status: updated.status });
  } catch (err) {
    console.error('cancelVendorBill error:', err);
    res.status(500).json({ error: 'Failed to cancel vendor bill.' });
  }
}

// ── Bill Payments ────────────────────────────────────────────────────────────

export async function getBillPayments(req, res) {
  try {
    const payments = await prisma.billPayment.findMany({
      include: {
        partner: true,
        vendorBill: true,
      },
      orderBy: { date: 'desc' },
    });

    const formatted = payments.map((p) => ({
      id: p.id,
      paymentType: p.paymentType,
      partnerId: p.partnerId,
      partnerName: p.partner?.name || '',
      vendorBillId: p.vendorBillId,
      billNumber: p.vendorBill?.billNumber || '',
      amount: formatDecimal(p.amount),
      date: formatDate(p.date),
      paymentVia: p.paymentVia,
      note: p.note || '',
      status: p.status,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('getBillPayments error:', err);
    res.status(500).json({ error: 'Failed to fetch bill payments.' });
  }
}

export async function createBillPayment(req, res) {
  try {
    const { vendorBillId, amount, date, paymentVia = 'BANK', note } = req.body;
    if (!vendorBillId) return res.status(400).json({ error: 'Vendor Bill is required.' });

    const bill = await prisma.vendorBill.findUnique({
      where: { id: vendorBillId },
      include: { vendor: true },
    });

    if (!bill) return res.status(404).json({ error: 'Vendor Bill not found.' });
    if (bill.status !== 'CONFIRMED') {
      return res.status(400).json({ error: 'Payments can only be created for Confirmed Bills.' });
    }

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid payment amount greater than 0.' });
    }
    if (payAmount > Number(bill.amountDue)) {
      return res.status(400).json({
        error: `Payment amount ($${payAmount.toFixed(2)}) cannot exceed remaining due amount ($${Number(bill.amountDue).toFixed(2)}).`,
      });
    }

    const payment = await prisma.billPayment.create({
      data: {
        paymentType: 'SEND',
        partnerId: bill.vendorId,
        vendorBillId: bill.id,
        amount: payAmount,
        date: date ? new Date(date) : new Date(),
        paymentVia: paymentVia.toUpperCase() === 'CASH' ? 'CASH' : 'BANK',
        note: note ? note.trim() : null,
        status: 'DRAFT',
      },
      include: {
        partner: true,
        vendorBill: true,
      },
    });

    res.status(201).json({
      id: payment.id,
      partnerId: payment.partnerId,
      partnerName: payment.partner?.name || '',
      vendorBillId: payment.vendorBillId,
      billNumber: payment.vendorBill?.billNumber || '',
      amount: formatDecimal(payment.amount),
      date: formatDate(payment.date),
      paymentVia: payment.paymentVia,
      note: payment.note || '',
      status: payment.status,
    });
  } catch (err) {
    console.error('createBillPayment error:', err);
    res.status(500).json({ error: 'Failed to create bill payment.' });
  }
}

/**
 * Confirm Bill Payment:
 * 1. Auto-generate balanced Journal Entry:
 *    Debit: Creditors A/c (amount)
 *    Credit: Bank A/c or Cash A/c (amount)
 * 2. Update payment status = CONFIRMED
 * 3. Update Bill amountDue and paymentStatus (PAID, PARTIAL, NOT_PAID)
 */
export async function confirmBillPayment(req, res) {
  try {
    const { id } = req.params;
    const payment = await prisma.billPayment.findUnique({
      where: { id },
      include: {
        vendorBill: {
          include: { payments: true },
        },
        partner: true,
      },
    });

    if (!payment) return res.status(404).json({ error: 'Payment not found.' });
    if (payment.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only Draft Payments can be confirmed.' });
    }

    const bill = payment.vendorBill;
    const payAmount = Number(payment.amount);

    // Accounts
    const creditorsAccount = await prisma.account.findFirst({
      where: { name: 'Creditors A/c' },
    }) || await prisma.account.findFirst({
      where: { type: 'LIABILITY' },
    });

    const paymentAccountName = payment.paymentVia === 'CASH' ? 'Cash A/c' : 'Bank A/c';
    const paymentAccount = await prisma.account.findFirst({
      where: { name: paymentAccountName },
    }) || await prisma.account.findFirst({
      where: { type: 'ASSET' },
    });

    if (!creditorsAccount || !paymentAccount) {
      return res.status(400).json({ error: 'Required accounts (Creditors / Bank / Cash) not found.' });
    }

    // Journal
    const journalType = payment.paymentVia === 'CASH' ? 'CASH' : 'BANK';
    const paymentJournal = await prisma.journal.findFirst({
      where: { type: journalType },
    }) || await prisma.journal.findFirst();

    const jeNumber = await getNextJournalEntryNumber(payment.paymentVia === 'CASH' ? 'CASH' : 'BANK');

    // Run in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create JE
      const je = await tx.journalEntry.create({
        data: {
          journalId: paymentJournal.id,
          date: payment.date,
          number: jeNumber,
          total: payAmount,
          status: 'POSTED',
          sourceType: 'BILL_PAYMENT',
          billPaymentId: payment.id,
          lines: {
            create: [
              {
                accountId: creditorsAccount.id,
                partnerId: payment.partnerId,
                debit: payAmount,
                credit: 0,
              },
              {
                accountId: paymentAccount.id,
                partnerId: payment.partnerId,
                debit: 0,
                credit: payAmount,
              },
            ],
          },
        },
      });

      // 2. Mark payment confirmed
      const updatedPayment = await tx.billPayment.update({
        where: { id },
        data: { status: 'CONFIRMED' },
      });

      // 3. Recompute bill's amountDue and paymentStatus
      const allConfirmedPayments = bill.payments
        .filter((p) => p.status === 'CONFIRMED' || p.id === payment.id)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const billTotal = Number(bill.total || 0);
      const newAmountDue = Math.max(0, Number((billTotal - allConfirmedPayments).toFixed(2)));

      let newPaymentStatus = 'NOT_PAID';
      if (newAmountDue === 0) {
        newPaymentStatus = 'PAID';
      } else if (newAmountDue < billTotal) {
        newPaymentStatus = 'PARTIAL';
      }

      const updatedBill = await tx.vendorBill.update({
        where: { id: bill.id },
        data: {
          amountDue: newAmountDue,
          paymentStatus: newPaymentStatus,
        },
      });

      return { updatedPayment, updatedBill, je };
    });

    res.json({
      message: 'Payment confirmed and Journal Entry posted.',
      paymentStatus: result.updatedPayment.status,
      billAmountDue: formatDecimal(result.updatedBill.amountDue),
      billPaymentStatus: result.updatedBill.paymentStatus,
      journalEntryNumber: result.je.number,
    });
  } catch (err) {
    console.error('confirmBillPayment error:', err);
    res.status(500).json({ error: err.message || 'Failed to confirm payment.' });
  }
}

export async function cancelBillPayment(req, res) {
  try {
    const { id } = req.params;
    const payment = await prisma.billPayment.findUnique({
      where: { id },
      include: {
        vendorBill: { include: { payments: true } },
      },
    });

    if (!payment) return res.status(404).json({ error: 'Payment not found.' });

    const bill = payment.vendorBill;

    // Run in transaction: cancel payment and recalculate bill amount due
    await prisma.$transaction(async (tx) => {
      await tx.billPayment.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      if (bill) {
        const remainingConfirmedPayments = bill.payments
          .filter((p) => p.status === 'CONFIRMED' && p.id !== id)
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        const billTotal = Number(bill.total || 0);
        const newAmountDue = Math.max(0, Number((billTotal - remainingConfirmedPayments).toFixed(2)));

        let newPaymentStatus = 'NOT_PAID';
        if (newAmountDue === 0) {
          newPaymentStatus = 'PAID';
        } else if (newAmountDue < billTotal) {
          newPaymentStatus = 'PARTIAL';
        }

        await tx.vendorBill.update({
          where: { id: bill.id },
          data: {
            amountDue: newAmountDue,
            paymentStatus: newPaymentStatus,
          },
        });
      }
    });

    res.json({ message: 'Payment cancelled.' });
  } catch (err) {
    console.error('cancelBillPayment error:', err);
    res.status(500).json({ error: 'Failed to cancel payment.' });
  }
}
