import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import ProductAdd from "./pages/products/ProductAdd";
import ProductList from "./pages/products/ProductList";
import GroupAdd from "./pages/definitions/groups/GroupAdd";
import GroupList from "./pages/definitions/groups/GroupList";

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
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;