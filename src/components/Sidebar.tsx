// src/components/Sidebar.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; 
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "./styles/Sidebar.css";

const Sidebar = () => {
  const { currentUser } = useAuth(); // 2. Aktif kullanıcıyı al
  const navigate = useNavigate();

  // 3. Çıkış Yapma Fonksiyonu
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login"); // Çıkış yapınca login'e at
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Flexy Mağaza</h2>
        {/* Kullanıcı rolünü veya e-postasını burada veya footerda gösterebiliriz */}
      </div>

      <nav className="sidebar-nav">

        <NavLink to="/" className="nav-item" end>
          <span className="nav-icon">🏠</span>
          Ana Sayfa
        </NavLink>

        <div className="nav-section">YÖNETİM</div>

        <NavLink to="/stores" className="nav-item">
          <span className="nav-icon">🏢</span>
          Mağazalar
        </NavLink>

        <NavLink to="/personnel" className="nav-item">
          <span className="nav-icon">👥</span>
          Personeller
        </NavLink>

        <NavLink to="/store-stocks" className="nav-item">
          <span className="nav-icon">🏪</span>
          Mağaza Stokları
        </NavLink>

        <div className="nav-section">MODÜLLER</div>

        <NavLink to="/purchases" className="nav-item">
          <span className="nav-icon">🛒</span>
          Alışlar
        </NavLink>

        <NavLink to="/sales" className="nav-item">
          <span className="nav-icon">🧾</span>
          Satışlar
        </NavLink>
        
        <NavLink to="/attendance" className="nav-item">
          <span className="nav-icon">📅</span>
          Puantaj Yönetimi
        </NavLink>

        <div className="nav-section">TANIMLAMALAR</div>

        <NavLink to="/products" className="nav-item">
          <span className="nav-icon">📦</span>
          Ürün Listesi
        </NavLink>

        <NavLink to="/prices/list" className="nav-item">
          <span className="nav-icon">💲</span>
          Fiyat Yönetimi
        </NavLink>

        <NavLink to="/stocks" className="nav-item">
          <span className="nav-icon">📊</span>
          Merkez Stok
        </NavLink>

        {/* Grup ve Kategori rotaları ayrıydı, onları ayırdık */}
        <NavLink to="/definitions/general" className="nav-item">
          <span className="nav-icon">📂</span>
          Gruplar/Kategoriler
        </NavLink>

        <NavLink to="/definitions/colors" className="nav-item">
          <span className="nav-icon">🎨</span>
          Renkler
        </NavLink>

        <NavLink to="/definitions/dimensions" className="nav-item">
          <span className="nav-icon">📏</span>
          Ebatlar
        </NavLink>

        <NavLink to="/definitions/cushions" className="nav-item">
          <span className="nav-icon">🛋️</span>
          Minderler
        </NavLink>

      </nav>

      {/* FOOTER: Kullanıcı Bilgisi ve Çıkış */}
      <div className="sidebar-footer">
        <div style={{ marginBottom: '10px', fontSize: '12px', color: '#bdc3c7' }}>
          Giriş Yapan: <br />
          <span style={{ color: 'white' }}>{currentUser?.email}</span>
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#c0392b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  );
};

export default Sidebar;