import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import ProductAdd from "./pages/products/ProductAdd";
import ProductList from "./pages/products/ProductList";
import GroupAdd from "./pages/definitions/groups/GroupAdd";
import GroupList from "./pages/definitions/groups/GroupList";
import CategoryAdd from "./pages/definitions/categories/CategoryAdd";
import CategoryList from "./pages/definitions/categories/CategoryList";
import ColorList from "./pages/definitions/colors/ColorList";
import ColorAdd from "./pages/definitions/colors/ColorAdd";
import CushionAdd from "./pages/definitions/cushions/CushionAdd";
import CushionList from "./pages/definitions/cushions/CushionList";
import DimensionList from "./pages/definitions/dimensions/DimensionList";
import DimensionAdd from "./pages/definitions/dimensions/DimensionAdd";
import ProductDetail from "./pages/products/ProductDetail";
import PriceList from "./pages/prices/PriceList";

function App() {
  return (
    <Router>
      {/* Ana Kapsayıcı: Ekranı tamamen kaplar ve yan yana dizer */}
      <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>

        {/* Sol Menü */}
        <Sidebar />

        {/* İçerik Alanı: Geri kalan tüm boşluğu doldurur */}
        <div style={{
          flex: 1,
          padding: '20px',
          backgroundColor: '#f5f6fa',
          overflowY: 'auto', // İçerik taşarsa kaydırma çubuğu çıkar
          color: '#333' // Yazıların kesinlikle siyah olmasını sağlar
        }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/add" element={<ProductAdd />} />
            <Route path="/definitions/groups/add" element={<GroupAdd />} />
            <Route path="/definitions/groups/list" element={<GroupList />} />
            <Route path="/definitions/categories/add" element={<CategoryAdd />} />
            <Route path="/definitions/categories/list" element={<CategoryList />} />
            <Route path="/definitions/colors" element={<ColorList />} />
            <Route path="/definitions/colors/add" element={<ColorAdd />} />
            <Route path="/definitions/dimensions" element={<DimensionList />} />
            <Route path="/definitions/dimensions/add" element={<DimensionAdd />} />
            <Route path="/definitions/cushions" element={<CushionList />} />
            <Route path="/definitions/cushions/add" element={<CushionAdd />} />
            <Route path="/products/detail/:id" element={<ProductDetail />} />
            <Route path="/prices/list" element={<PriceList />} />
            
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;