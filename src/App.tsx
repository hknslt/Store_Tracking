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
import GroupAdd from "./pages/definitions/groups/GroupAdd";
import DefinitionsPage from "./pages/definitions/groups/DefinitionsPage";
import PriceList from "./pages/prices/PriceList";
import StockList from "./pages/stocks/StockList";
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
import StoreDashboard from "./pages/stores/StoreDashboard";
import DebtList from "./pages/debts/DebtList";
import PurchaseDetail from "./pages/purchases/PurchaseDetail";
import PersonnelDetail from "./pages/personnel/PersonnelDetail";

// --- CUSTOM COMPONENT: Store Back Button ---
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
      {/* SVG Arrow Icon */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
      Mağaza Paneline Dön
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

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* Show Sidebar ONLY if NOT a Store Admin */}
      {!isStoreAdmin && <Sidebar />}

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f6fa',
        overflow: 'hidden'
      }}>

        {/* 👇 SPECIAL BACK NAVIGATION BAR FOR STORE ADMINS */}
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
            position: 'sticky',
            top: 0
          }}>
            {/* Custom Beautiful Button */}
            <StoreBackButton onClick={() => navigate(`/stores/${userData?.storeId}`)} />

            {/* User Info Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* 👇 DÜZELTME BURADA YAPILDI: Hatalı 'sm' özelliği kaldırıldı */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#344054' }}>
                  {userData?.fullName}
                </div>
                <div style={{ fontSize: '11px', color: '#1e703a', fontWeight: '500' }}>
                  Mağaza Yöneticisi
                </div>
              </div>
              {/* Avatar Circle */}
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

            {/* Products */}
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/add" element={<ProductAdd />} />

            {/* Definitions */}
            <Route path="/definitions/general" element={<DefinitionsPage />} />
            <Route path="/definitions/groups/add" element={<GroupAdd />} />
            <Route path="/definitions/dimensions" element={<DimensionsPage />} />
            <Route path="/definitions/colors" element={<ColorsPage />} />
            <Route path="/definitions/cushions" element={<CushionsPage />} />

            {/* Price, Stock & Purchase */}
            <Route path="/prices/list" element={<PriceList />} />
            <Route path="/prices/manage" element={<PriceManager />} />
            <Route path="/stocks" element={<StockList />} />
            <Route path="/store-stocks" element={<StoreStockManager />} />
            <Route path="/purchases" element={<PurchaseList />} />
            <Route path="/purchases/add" element={<PurchaseAdd />} />
            <Route path="/purchases/:storeId/:id" element={<PurchaseDetail />} />

            {/* Management */}
            <Route path="/stores" element={<StoreList />} />
            <Route path="/stores/add" element={<StoreAdd />} />
            <Route path="/stores/:id" element={<StoreDashboard />} />

            <Route path="/personnel" element={<PersonnelList />} />
            <Route path="/personnel/add" element={<PersonnelAdd />} />
            <Route path="/personnel/:id" element={<PersonnelDetail />} />
            <Route path="/attendance" element={<AttendanceManager />} />
            <Route path="/register" element={<Register />} />

            {/* Sales Module */}
            <Route path="/sales" element={<SaleList />} />
            <Route path="/sales/add" element={<SaleAdd />} />
            <Route path="/sales/:storeId/:saleId" element={<SaleDetail />} />

            {/* Payment Methods & Transactions */}
            <Route path="/definitions/payment-methods" element={<PaymentMethods />} />
            <Route path="/payments/add" element={<PaymentAdd />} />
            <Route path="/payments/list" element={<PaymentList />} />

            {/* SSH Records */}
            <Route path="/ssh/list" element={<SSHList />} />
            <Route path="/ssh/add" element={<SSHAdd />} />

            {/* Borç / Cari Takip */}
            <Route path="/debts" element={<DebtList />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;