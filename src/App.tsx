// src/App.tsx
import { useState } from "react";
import { HashRouter as Router, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Components
import Sidebar from "./components/Sidebar";

// Pages
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ProductAdd from "./pages/products/ProductAdd";
import ProductList from "./pages/products/ProductList";
import DefinitionsPage from "./pages/definitions/groups/DefinitionsPage";

import PurchaseList from "./pages/purchases/PurchaseList";
import PurchaseAdd from "./pages/purchases/PurchaseAdd";
import StoreList from "./pages/stores/StoreList";
import StoreAdd from "./pages/stores/StoreAdd";
import PersonnelList from "./pages/personnel/PersonnelList";
import PersonnelAdd from "./pages/personnel/PersonnelAdd";
import StoreStockManager from "./pages/stocks/StoreStockManager";
import SaleList from "./pages/sales/SaleList";
import SaleAdd from "./pages/sales/SaleAdd";
import ColorsPage from "./pages/definitions/colors/ColorsPage";
import DimensionsPage from "./pages/definitions/dimensions/DimensionsPage";
import CushionsPage from "./pages/definitions/cushions/CushionsPage";
import AttendanceManager from "./pages/personnel/AttendanceManager";
import PriceManager from "./pages/prices/PriceManager";
import SSHList from "./pages/ssh/SSHList";
import SSHAdd from "./pages/ssh/SSHAdd";
import SaleDetail from "./pages/sales/SaleDetail";
import PaymentMethods from "./pages/definitions/Payment/PaymentMethods";
import PaymentAdd from "./pages/payments/PaymentAdd";
import PaymentList from "./pages/payments/PaymentList";
import StoreDashboard from "./pages/Dashboard/StoreDashboard";
import DebtList from "./pages/debts/DebtList";
import PurchaseDetail from "./pages/purchases/PurchaseDetail";
import PersonnelDetail from "./pages/personnel/PersonnelDetail";
import StoreCashRegisters from "./pages/finance/StoreCashRegisters";
import ReportsMain from "./pages/reports/ReportsMain";
import StoreSalesReport from "./pages/reports/StoreSalesReport";
import Settings from "./pages/settings/Settings";
import FinanceReport from "./pages/reports/FinanceReport";
import StockReport from "./pages/reports/StockReport";
import PersonnelReport from "./pages/reports/PersonnelReport";
import ReportsDashboard from "./pages/Dashboard/ReportsDashboard";
import StoreTargets from "./pages/targets/StoreTargets";
import PersonnelCommissions from "./pages/targets/PersonnelCommissions";
import InvoiceTracking from "./pages/tracking/InvoiceTracking";
import PersonnelEdit from "./pages/personnel/PersonnelEdit";
import StoreEdit from "./pages/stores/StoreEdit";
import StoreComparison from "./pages/reports/StoreComparison";
import SSHDetail from "./pages/ssh/SSHDetail";
import SaleEdit from "./pages/sales/SaleEdit";
import PurchaseEdit from "./pages/purchases/PurchaseEdit";
import UserEdit from "./pages/admin/UserEdit";
import UserList from "./pages/admin/UserList";
import PriceList from "./pages/prices/PriceList";
import PriceDetail from "./pages/prices/PriceDetail";
import PaymentDetail from "./pages/payments/PaymentDetail";
import PaymentEdit from "./pages/payments/PaymentEdit";
import DeviceRequests from "./pages/admin/DeviceRequests";
import RegisteredDevices from "./pages/admin/RegisteredDevices";


// --- CUSTOM COMPONENT: Store Back Button (Mağaza Müdürü İçin) ---
const StoreBackButton = ({ onClick }: { onClick: () => void }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        border: '1px solid #e0e6ed',
        backgroundColor: isHovered ? '#1e703a' : '#f0fdf4',
        color: isHovered ? 'white' : '#1e703a',
        padding: '8px 16px',
        borderRadius: '30px',
        fontWeight: '600',
        fontSize: '14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
        boxShadow: isHovered ? '0 4px 12px rgba(30, 112, 58, 0.2)' : 'none',
        transform: isHovered ? 'translateY(-1px)' : 'none',
        outline: 'none'
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
      Mağaza Paneline Dön
    </button>
  );
};

// --- CUSTOM COMPONENT: Admin Back Button (Süper Admin İçin - YENİ) ---
const AdminBackButton = ({ onClick }: { onClick: () => void }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: isHovered ? '#f0fdf4' : 'white',
        border: isHovered ? '1px solid #4ade80' : '1px solid #cbd5e1',
        padding: '8px 16px',
        borderRadius: '10px',
        cursor: 'pointer',
        color: isHovered ? '#052e16' : '#64748b',
        fontSize: '13px',
        fontWeight: '600',
        transition: 'all 0.2s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        marginBottom: '15px' // Altındaki içerikle mesafe
      }}
    >
      <span style={{ fontSize: '16px', lineHeight: 0, marginTop: '-2px' }}>‹</span> Geri Dön
    </button>
  );
};

// --- 1. PROTECTED LAYOUT (Sidebar & Navigation Logic) ---
const ProtectedLayout = () => {
  const { currentUser, loading, userRole, userData } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Yükleniyor...</div>;

  if (!currentUser) return <Navigate to="/login" />;

  // Role Checks
  const isStoreAdmin = userRole === 'store_admin';

  // Is the Store Manager currently on their own Dashboard?
  const isAtDashboard = userData?.storeId
    ? location.pathname === `/stores/${userData.storeId}`
    : false;

  // SÜPER ADMIN GERİ BUTONU KONTROLÜ
  // 1. Mağaza Müdürü değilse
  // 2. Ana Sayfada (/) değilse
  const showAdminBackButton = !isStoreAdmin && location.pathname !== '/' && location.pathname !== '/reports/dashboard';

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#f8fafc' }}>

      {/* Show Sidebar ONLY if NOT a Store Admin */}
      {!isStoreAdmin && <Sidebar />}

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0 // Flexbox taşma önleyici
      }}>

        {/* --- MAĞAZA MÜDÜRÜ İÇİN ÖZEL GERİ BUTONU --- */}
        {isStoreAdmin && !isAtDashboard && (
          <div style={{
            padding: '12px 24px',
            backgroundColor: 'white',
            borderBottom: '1px solid #eaecf0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            zIndex: 20,
            flexShrink: 0
          }}>
            <StoreBackButton onClick={() => navigate(`/stores/${userData?.storeId}`)} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#344054' }}>
                  {userData?.fullName}
                </div>
                <div style={{ fontSize: '11px', color: '#1e703a', fontWeight: '500' }}>
                  Mağaza Yöneticisi
                </div>
              </div>
              <div style={{
                width: '36px', height: '36px',
                backgroundColor: '#e0f2f1', color: '#1e703a',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', border: '2px solid white', boxShadow: '0 0 0 2px #e0f2f1'
              }}>
                {userData?.fullName?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        )}

        {/* --- SÜPER ADMIN İÇİN GERİ BUTONU --- */}
        {showAdminBackButton && (
          <div style={{ padding: '25px 25px 0 25px', flexShrink: 0 }}>
            <AdminBackButton onClick={() => navigate(-1)} />
          </div>
        )}

        {/* Actual Page Content */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto', // Scroll happens here
          color: '#333'
        }}>
          <Outlet />
        </div>

      </div>
    </div>
  );
};

// --- 2. PUBLIC LAYOUT ---
const PublicLayout = () => {
  const { currentUser, loading } = useAuth();
  if (loading) return null;
  if (currentUser) return <Navigate to="/" />;
  return <Outlet />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* A) PUBLIC AREA */}
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* B) PROTECTED AREA */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Home />} />

            <Route path="/admin/users" element={<UserList />} />
            <Route path="/admin/users/edit/:id" element={<UserEdit />} />
            <Route path="/admin/devices" element={<RegisteredDevices />} />
            <Route path="/admin/devices/requests" element={<DeviceRequests />} />

            {/* Products */}
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/add" element={<ProductAdd />} />

            {/* Definitions */}
            <Route path="/definitions/general" element={<DefinitionsPage />} />
            <Route path="/definitions/dimensions" element={<DimensionsPage />} />
            <Route path="/definitions/colors" element={<ColorsPage />} />
            <Route path="/definitions/cushions" element={<CushionsPage />} />
            <Route path="/definitions/payment-methods" element={<PaymentMethods />} />

            {/* Price, Stock & Purchase */}
            <Route path="/prices/list" element={<PriceList />} />
            <Route path="/prices/manage" element={<PriceManager />} />
            <Route path="/prices/manage/:id" element={<PriceManager />} />
            <Route path="/prices/detail/:id" element={<PriceDetail />} />


            <Route path="/store-stocks" element={<StoreStockManager />} />
            <Route path="/purchases" element={<PurchaseList />} />
            <Route path="/purchases/add" element={<PurchaseAdd />} />
            <Route path="/purchases/:storeId/:id" element={<PurchaseDetail />} />
            <Route path="/purchases/:storeId/edit/:id" element={<PurchaseEdit />} />

            {/* Management */}
            <Route path="/stores" element={<StoreList />} />
            <Route path="/stores/add" element={<StoreAdd />} />
            <Route path="/stores/edit/:id" element={<StoreEdit />} />
            <Route path="/finance/cash-registers" element={<StoreCashRegisters />} />

            <Route path="/personnel" element={<PersonnelList />} />
            <Route path="/personnel/add" element={<PersonnelAdd />} />
            <Route path="/personnel/:id" element={<PersonnelDetail />} />
            <Route path="/personnel/edit/:id" element={<PersonnelEdit />} />
            <Route path="/attendance" element={<AttendanceManager />} />
            <Route path="/commissions" element={<PersonnelCommissions />} />
            <Route path="/register" element={<Register />} />
            <Route path="/invoiceTracking" element={<InvoiceTracking />} />

            {/* Sales Module */}
            <Route path="/sales" element={<SaleList />} />
            <Route path="/sales/add" element={<SaleAdd />} />
            <Route path="/sales/:storeId/:saleId" element={<SaleDetail />} />
            <Route path="/sales/:storeId/edit/:id" element={<SaleEdit />} />

            {/* Payment Methods & Transactions */}
            <Route path="/payments/add" element={<PaymentAdd />} />
            <Route path="/payments/list" element={<PaymentList />} />
            <Route path="/payments/detail/:id" element={<PaymentDetail />} />
            <Route path="/payments/edit/:id" element={<PaymentEdit />} />

            {/* SSH Records */}
            <Route path="/ssh/list" element={<SSHList />} />
            <Route path="/ssh/add" element={<SSHAdd />} />
            <Route path="/ssh/:id" element={<SSHDetail />} />

            {/* Borç / Cari Takip */}
            <Route path="/debts" element={<DebtList />} />

            {/* RAPORLAR */}
            <Route path="/reports" element={<ReportsMain />} />
            <Route path="/reports/sales" element={<StoreSalesReport />} />
            <Route path="/reports/finance" element={<FinanceReport />} />
            <Route path="/reports/stocks" element={<StockReport />} />
            <Route path="/reports/personnel" element={<PersonnelReport />} />
            <Route path="/reports/compare" element={<StoreComparison />} /> {/* Rota */}

            {/* Ayarlar */}
            <Route path="/settings" element={<Settings />} />

            {/* Dashboard Routes */}
            <Route path="/reports/dashboard" element={<ReportsDashboard />} />
            <Route path="/stores/:id" element={<StoreDashboard />} />

            {/* Mağaza Hedefleri (KPI) */}
            <Route path="/targets" element={<StoreTargets />} />


          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;