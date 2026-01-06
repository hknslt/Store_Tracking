// src/App.tsx
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext"; // AuthContext'i ekledik

// Bileşenler
import Sidebar from "./components/Sidebar";

// Sayfalar
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import RegisterAdmin from "./pages/auth/RegisterAdmin";
import ProductAdd from "./pages/products/ProductAdd";
import ProductList from "./pages/products/ProductList";
import ProductDetail from "./pages/products/ProductDetail";
import GroupAdd from "./pages/definitions/groups/GroupAdd";
import DefinitionsPage from "./pages/definitions/groups/DefinitionsPage";
import ColorList from "./pages/definitions/colors/ColorList";
import ColorAdd from "./pages/definitions/colors/ColorAdd";
import CushionAdd from "./pages/definitions/cushions/CushionAdd";
import CushionList from "./pages/definitions/cushions/CushionList";
import DimensionList from "./pages/definitions/dimensions/DimensionList";
import DimensionAdd from "./pages/definitions/dimensions/DimensionAdd";
import PriceList from "./pages/prices/PriceList";
import StockList from "./pages/stocks/StockList";
import PurchaseList from "./pages/purchases/PurchaseList";
import PurchaseAdd from "./pages/purchases/PurchaseAdd";
import StoreList from "./pages/stores/StoreList";
import StoreAdd from "./pages/stores/StoreAdd";
import PersonnelList from "./pages/personnel/PersonnelList";
import PersonnelAdd from "./pages/personnel/PersonnelAdd";
import StoreStockManager from "./pages/stocks/StoreStockManager";

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
            <Route path="/register-admin" element={<RegisterAdmin />} />
          </Route>

          {/* B) KORUMALI ALAN (Sidebar Var) */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Home />} />

            {/* Ürünler */}
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/add" element={<ProductAdd />} />
            <Route path="/products/detail/:id" element={<ProductDetail />} />

            {/* Tanımlamalar */}
            <Route path="/definitions/general" element={<DefinitionsPage />} />
            <Route path="/definitions/groups/add" element={<GroupAdd />} />

            <Route path="/definitions/dimensions" element={<DimensionList />} />
            <Route path="/definitions/dimensions/add" element={<DimensionAdd />} />

            <Route path="/definitions/colors" element={<ColorList />} />
            <Route path="/definitions/colors/add" element={<ColorAdd />} />

            <Route path="/definitions/cushions" element={<CushionList />} />
            <Route path="/definitions/cushions/add" element={<CushionAdd />} />

            {/* Fiyat & Stok & Alış */}
            <Route path="/prices/list" element={<PriceList />} />
            <Route path="/stocks" element={<StockList />} />
            <Route path="/store-stocks" element={<StoreStockManager />} />

            <Route path="/purchases" element={<PurchaseList />} />
            <Route path="/purchases/add" element={<PurchaseAdd />} />

            {/* Yönetim */}
            <Route path="/stores" element={<StoreList />} />
            <Route path="/stores/add" element={<StoreAdd />} />
            <Route path="/personnel" element={<PersonnelList />} />
            <Route path="/personnel/add" element={<PersonnelAdd />} />
          </Route>

          {/* Hatalı Rota */}
          <Route path="*" element={<Navigate to="/" />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;