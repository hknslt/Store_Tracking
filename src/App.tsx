// src/App.tsx
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext"; // AuthContext'i ekledik

// Bileşenler
import Sidebar from "./components/Sidebar";

// Sayfalar
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

// --- 1. KORUMALI DÜZEN (Sidebar Burada Olacak) ---
// Giriş yapmış kullanıcılar burayı ve Sidebar'ı görür.
const ProtectedLayout = () => {
  const { currentUser, loading } = useAuth();

  // Firebase kontrol ediyorsa bekle (Beni hatırla)
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Yükleniyor...</div>;

  // Kullanıcı yoksa Login'e at
  if (!currentUser) return <Navigate to="/login" />;

  // Kullanıcı varsa Sidebar ve İçerik yapısını döndür
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* Sol Menü */}
      <Sidebar />

      {/* İçerik Alanı */}
      <div style={{
        flex: 1,
        padding: '20px',
        backgroundColor: '#f5f6fa',
        overflowY: 'auto',
        color: '#333'
      }}>
        {/* Outlet: Alt rotalar (Home, ProductList vs.) buraya yerleşir */}
        <Outlet />
      </div>
    </div>
  );
};

// --- 2. HERKESE AÇIK DÜZEN (Login/Register) ---
// Giriş yapmışsa Login'i görmesin, Ana Sayfaya gitsin.
const PublicLayout = () => {
  const { currentUser, loading } = useAuth();

  if (loading) return null;

  // Zaten giriş yapmışsa içeri yönlendir
  if (currentUser) return <Navigate to="/" />;

  // Değilse Login sayfasını göster (Sidebar YOK)
  return <Outlet />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* A) GİRİŞ YAPILMAMIŞ ALAN (Sidebar Yok) */}
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* B) KORUMALI ALAN (Sidebar Var) */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Home />} />

            {/* Ürünler */}
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/add" element={<ProductAdd />} />

            {/* Tanımlamalar */}
            <Route path="/definitions/general" element={<DefinitionsPage />} />
            <Route path="/definitions/groups/add" element={<GroupAdd />} />

            <Route path="/definitions/dimensions" element={<DimensionsPage />} />

            <Route path="/definitions/colors" element={<ColorsPage />} />

            <Route path="/definitions/cushions" element={<CushionsPage />} />

            {/* Fiyat & Stok & Alış */}
            <Route path="/prices/list" element={<PriceList />} />
            <Route path="/prices/manage" element={<PriceManager />} />

            <Route path="/stocks" element={<StockList />} />
            <Route path="/store-stocks" element={<StoreStockManager />} />

            <Route path="/purchases" element={<PurchaseList />} />
            <Route path="/purchases/add" element={<PurchaseAdd />} />

            {/* Yönetim */}
            <Route path="/stores" element={<StoreList />} />
            <Route path="/stores/add" element={<StoreAdd />} />
            <Route path="/personnel" element={<PersonnelList />} />
            <Route path="/personnel/add" element={<PersonnelAdd />} />


            {/* Satış Modülü */}
            <Route path="/sales" element={<SaleList />} />
            <Route path="/sales/add" element={<SaleAdd />} />
            <Route path="/sales/:storeId/:saleId" element={<SaleDetail />} />
            
            {/* Puantaj Yönetimi */}
            <Route path="/attendance" element={<AttendanceManager />} />

             <Route path="/register" element={<Register />} />

          {/* SSH Kayıtları */}
          <Route path="/ssh/list" element={<SSHList />} />
          <Route path="/ssh/add" element={<SSHAdd />} />
          </Route>

          

          {/* Hatalı Rota */}
          <Route path="*" element={<Navigate to="/" />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;