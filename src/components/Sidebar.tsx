// src/components/Sidebar.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "./styles/Sidebar.css";

// 👇 LOGO IMPORT
import logo from "../assets/logo/Bahçemo_white.png";

const Sidebar = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  };

  const userInitial = currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : "U";

  return (
    <div className="sidebar">
      {/* HEADER (Logo Güncellendi) */}
      <div
        className="sidebar-header"
        style={{
          display: 'flex',
          flexDirection: 'column', // Alt alta diz (Logo üstte, yazı altta olsun isterseniz)
          justifyContent: 'center', // Yatayda ortala
          alignItems: 'center',     // Dikeyde ortala
          padding: '20px',
          gap: '10px' // Logo ile alttaki yazı arasındaki boşluk
        }}
      >
        <img
          src={logo}
          alt="Flexy Logo"
          style={{
            width: '150px',       // İstediğiniz genişlik
            height: '80px',       // İstediğiniz yükseklik
            objectFit: 'contain'  // Resim bozulmasın diye (Alternatifleri aşağıda)
          }}
        />
      </div>

      {/* NAVIGASYON LİSTESİ */}
      <nav className="sidebar-nav">

        <NavLink to="/" className="nav-item" end>
          <span className="nav-icon">🏠</span>
          <span>Ana Sayfa</span>
        </NavLink>

        <div className="nav-section">Yönetim</div>

        <NavLink to="/stores" className="nav-item">
          <span className="nav-icon">🏢</span>
          <span>Mağazalar</span>
        </NavLink>

        <NavLink to="/personnel" className="nav-item">
          <span className="nav-icon">👥</span>
          <span>Personeller</span>
        </NavLink>

        <NavLink to="/store-stocks" className="nav-item">
          <span className="nav-icon">🏪</span>
          <span>Mağaza Stokları</span>
        </NavLink>

        <div className="nav-section">Modüller</div>

        <NavLink to="/sales/add" className="nav-item">
          <span className="nav-icon">➕</span>
          <span>Hızlı Satış</span>
        </NavLink>

        <NavLink to="/sales" className="nav-item">
          <span className="nav-icon">🧾</span>
          <span>Satış Listesi</span>
        </NavLink>

        <NavLink to="/purchases" className="nav-item">
          <span className="nav-icon">🛒</span>
          <span>Alışlar</span>
        </NavLink>
        
        <NavLink to="/payments/list" className="nav-item">
          <span className="nav-icon">📄</span>
          <span>Ödeme Listesi</span>
        </NavLink>

        <NavLink to= "/payments/add" className="nav-item">
          <span className="nav-icon">💰</span>
          <span>Ödeme Ekle</span>
        </NavLink>
        
        
        <NavLink to="/attendance" className="nav-item">
          <span className="nav-icon">📅</span>
          <span>Puantaj</span>
        </NavLink>
        <NavLink to="/ssh/list" className="nav-item">
          <span className="nav-icon">🛠️</span>
          <span>SSH Kayıtları</span>
        </NavLink>

        <div className="nav-section">Katalog & Stok</div>

        <NavLink to="/products" className="nav-item">
          <span className="nav-icon">📦</span>
          <span>Ürün Listesi</span>
        </NavLink>

        <NavLink to="/stocks" className="nav-item">
          <span className="nav-icon">📊</span>
          <span>Merkez Stok</span>
        </NavLink>

        <NavLink to="/prices/list" className="nav-item">
          <span className="nav-icon">💲</span>
          <span>Fiyat Listesi</span>
        </NavLink>

        <div className="nav-section">Tanımlamalar</div>

        <NavLink to="/definitions/general" className="nav-item">
          <span className="nav-icon">📂</span>
          <span>Gruplar</span>
        </NavLink>

        <NavLink to="/definitions/colors" className="nav-item">
          <span className="nav-icon">🎨</span>
          <span>Renkler</span>
        </NavLink>

        <NavLink to="/definitions/dimensions" className="nav-item">
          <span className="nav-icon">📏</span>
          <span>Ebatlar</span>
        </NavLink>

        <NavLink to="/definitions/cushions" className="nav-item">
          <span className="nav-icon">🛋️</span>
          <span>Minderler</span>
        </NavLink>

        <NavLink to="/definitions/payment-methods" className="nav-item">
          <span className="nav-icon">💳</span>
          <span>Ödeme Yöntemleri</span>
        </NavLink>

        <NavLink to="/register" className="nav-item">
          <span className="nav-icon">➕</span>
          <span>Yeni Kullanıcı</span>
        </NavLink>

      </nav>

      {/* FOOTER */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-info">
            <div className="user-avatar">
              {userInitial}
            </div>
            <div className="user-details">
              <span className="user-email">{currentUser?.email}</span>
              <span className="user-role">Aktif Kullanıcı</span>
            </div>
          </div>

          <button onClick={handleLogout} className="logout-btn">
            <span>Çıkış Yap</span>
            <span>➜</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;