import { Router } from 'express';
import {
  getPurchaseOptions,
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  createBillFromPO,
  getVendorBills,
  getVendorBillById,
  createVendorBill,
  updateVendorBill,
  confirmVendorBill,
  cancelVendorBill,
  getBillPayments,
  createBillPayment,
  confirmBillPayment,
  cancelBillPayment,
} from '../controllers/purchase.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Helper Options for forms
router.get('/purchase/options', getPurchaseOptions);

// Purchase Orders
router.get('/purchase-orders', getPurchaseOrders);
router.get('/purchase-orders/:id', getPurchaseOrderById);
router.post('/purchase-orders', createPurchaseOrder);
router.put('/purchase-orders/:id', updatePurchaseOrder);
router.post('/purchase-orders/:id/confirm', confirmPurchaseOrder);
router.post('/purchase-orders/:id/cancel', cancelPurchaseOrder);
router.post('/purchase-orders/:id/create-bill', createBillFromPO);

// Vendor Bills
router.get('/vendor-bills', getVendorBills);
router.get('/vendor-bills/:id', getVendorBillById);
router.post('/vendor-bills', createVendorBill);
router.put('/vendor-bills/:id', updateVendorBill);
router.post('/vendor-bills/:id/confirm', confirmVendorBill);
router.post('/vendor-bills/:id/cancel', cancelVendorBill);

// Bill Payments
router.get('/bill-payments', getBillPayments);
router.post('/bill-payments', createBillPayment);
router.post('/bill-payments/:id/confirm', confirmBillPayment);
router.post('/bill-payments/:id/cancel', cancelBillPayment);

export default router;
