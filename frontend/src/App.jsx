import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import CreateUserPage from './pages/auth/CreateUserPage';
import DashboardPage from './pages/DashboardPage';
import PlaceholderPage from './pages/PlaceholderPage';
import ProductsPage from './pages/account/ProductsPage';
import ContactsPage from './pages/account/ContactsPage';
import PortalDashboard from './pages/portal/PortalDashboard';
import ChartOfAccountsPage from './pages/account/ChartOfAccountsPage';
import JournalsPage from './pages/account/JournalsPage';
import BudgetReportPage from './pages/reports/BudgetReportPage';
import JournalEntriesPage from './pages/account/JournalEntriesPage';

import PurchaseOrdersPage from './pages/purchase/PurchaseOrdersPage';
import VendorBillsPage from './pages/purchase/VendorBillsPage';
import BillPaymentPage from './pages/purchase/BillPaymentPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Authenticated routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Accountant']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />

            {/* Admin-only routes */}
            <Route
              path="admin/create-user"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <CreateUserPage />
                </ProtectedRoute>
              }
            />

            {/* Sales — Phase 6 */}
            <Route
              path="sales/orders"
              element={<PlaceholderPage title="Sales orders" icon="📋" />}
            />
            <Route
              path="sales/invoices"
              element={<PlaceholderPage title="Sale invoices" icon="🧾" />}
            />
            <Route
              path="sales/receipts"
              element={<PlaceholderPage title="Receipts" icon="💰" />}
            />

            {/* Purchase — Phase 5 */}
            <Route path="purchase/orders" element={<PurchaseOrdersPage />} />
            <Route path="purchase/bills" element={<VendorBillsPage />} />
            <Route path="purchase/payments" element={<BillPaymentPage />} />

            {/* Account — Phase 2 */}
            <Route path="account/contacts" element={<ContactsPage />} />
            <Route path="account/products" element={<ProductsPage />} />
            <Route
              path="account/analytics"
              element={<PlaceholderPage title="Analyticals" icon="📈" />}
            />
            <Route
              path="account/budgets"
              element={<BudgetReportPage />}
            />
            <Route
              path="account/chart-of-accounts"
              element={<ChartOfAccountsPage />}
            />
            <Route
              path="account/journals"
              element={<JournalsPage />}
            />
            <Route
              path="account/journal-entries"
              element={<JournalEntriesPage />}
            />

            {/* Reports — Phase 7 */}
            <Route
              path="reports/balance-sheet"
              element={<PlaceholderPage title="Balance sheet" icon="⚖️" />}
            />
            <Route
              path="reports/profit-loss"
              element={<PlaceholderPage title="Profit and Loss" icon="📊" />}
            />
            <Route
              path="reports/budget"
              element={<BudgetReportPage />}
            />
          </Route>

          {/* Contact User portal — Phase 8 */}
          <Route
            path="/portal"
            element={
              <ProtectedRoute allowedRoles={['Contact']}>
                <PortalDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
