import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "./styles/Sidebar.css";

// LOGO
import logo from "../assets/logo/Bahçemo_white.png";

// 👇 1. İKONLARI BURAYA IMPORT ET (Dosya isimlerini kendine göre düzenle)
import homeIcon from "../assets/icons/home.svg";       // Ana Sayfa
import storeIcon from "../assets/icons/store.svg";     // Mağazalar
import userIcon from "../assets/icons/users.svg";      // Personel
import stockIcon from "../assets/icons/boxes.svg";       // Stok
import productIcon from "../assets/icons/product.svg"; // Ürün
import priceIcon from "../assets/icons/tags.svg";       // Fiyat
import salesIcon from "../assets/icons/receipt.svg";   // Satış
import cartIcon from "../assets/icons/inbox-in.svg";       // Alış
import walletIcon from "../assets/icons/wallet.svg";   // Ödeme
import toolsIcon from "../assets/icons/customer-service.svg";  // Servis
import timeIcon from "../assets/icons/calendar-clock.svg";      // Puantaj
import folderIcon from "../assets/icons/folder.svg";   // Gruplar
import paletteIcon from "../assets/icons/palette.svg"; // Renkler
import rulerIcon from "../assets/icons/ruler.svg";     // Ebatlar
import sofaIcon from "../assets/icons/sofa.svg";       // Minder
import cardIcon from "../assets/icons/credit-card.svg";// Ödeme Yöntemi
import addIcon from "../assets/icons/user-add.svg";        // Ekle
import logoutIcon from "../assets/icons/logout.svg";   // Çıkış

const Sidebar = () => {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  };

  const userInitial = currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : "U";

  if (userRole === 'store_admin' || userRole === 'staff') return null;

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>

      <button
        className="sidebar-toggle-btn"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {/* Açıkken < (Kapat), Kapalıyken > (Aç) */}
        {isCollapsed ? "❯" : "❮"}
      </button>

      <div className="sidebar-header">
        <img src={logo} alt="Logo" className="sidebar-logo" />
        <div className="sidebar-brand-text">YÖNETİM PANELİ</div>
      </div>

      <nav className="sidebar-nav">

        <NavLink to="/" className="nav-item" end>
          {/* 👇 2. EMOJİ YERİNE IMG KULLAN */}
          <span className="nav-icon"><img src={homeIcon} alt="" /></span>
          <span className="nav-text">Ana Sayfa</span>
        </NavLink>

        <div className="nav-section"><span>YÖNETİM</span></div>

        <NavLink to="/stores" className="nav-item">
          <span className="nav-icon"><img src={storeIcon} alt="" /></span>
          <span className="nav-text">Mağazalar</span>
        </NavLink>

        <NavLink to="/personnel" className="nav-item">
          <span className="nav-icon"><img src={userIcon} alt="" /></span>
          <span className="nav-text">Personeller</span>
        </NavLink>

        <NavLink to="/store-stocks" className="nav-item">
          <span className="nav-icon"><img src={stockIcon} alt="" /></span>
          <span className="nav-text">Mağaza Stokları</span>
        </NavLink>

        <NavLink to="/finance/cash-registers" className="nav-item">
          <span className="nav-icon"><img src={walletIcon} alt="" /></span>
          <span className="nav-text">Mağaza Kasaları</span>
        </NavLink>

        <div className="nav-section"><span>KATALOG & ÜRÜN</span></div>

        <NavLink to="/products" className="nav-item">
          <span className="nav-icon"><img src={productIcon} alt="" /></span>
          <span className="nav-text">Ürün Listesi</span>
        </NavLink>

        <NavLink to="/prices/list" className="nav-item">
          <span className="nav-icon"><img src={priceIcon} alt="" /></span>
          <span className="nav-text">Fiyat Listesi</span>
        </NavLink>

        <div className="nav-section"><span>MODÜLLER</span></div>

        <NavLink to="/sales" className="nav-item">
          <span className="nav-icon"><img src={salesIcon} alt="" /></span>
          <span className="nav-text">Satış Listesi</span>
        </NavLink>

        <NavLink to="/purchases" className="nav-item">
          <span className="nav-icon"><img src={cartIcon} alt="" /></span>
          <span className="nav-text">Alışlar</span>
        </NavLink>

        <NavLink to="/payments/list" className="nav-item">
          <span className="nav-icon"><img src={walletIcon} alt="" /></span>
          <span className="nav-text">Kasa & Finans</span>
        </NavLink>

        <NavLink to="/ssh/list" className="nav-item">
          <span className="nav-icon"><img src={toolsIcon} alt="" /></span>
          <span className="nav-text">SSH / Servis</span>
        </NavLink>

        <NavLink to="/attendance" className="nav-item">
          <span className="nav-icon"><img src={timeIcon} alt="" /></span>
          <span className="nav-text">Puantaj</span>
        </NavLink>

        <div className="nav-section"><span>TANIMLAMALAR</span></div>

        <NavLink to="/definitions/general" className="nav-item">
          <span className="nav-icon"><img src={folderIcon} alt="" /></span>
          <span className="nav-text">Gruplar</span>
        </NavLink>

        <NavLink to="/definitions/colors" className="nav-item">
          <span className="nav-icon"><img src={paletteIcon} alt="" /></span>
          <span className="nav-text">Renkler</span>
        </NavLink>

        <NavLink to="/definitions/dimensions" className="nav-item">
          <span className="nav-icon"><img src={rulerIcon} alt="" /></span>
          <span className="nav-text">Ebatlar</span>
        </NavLink>

        <NavLink to="/definitions/cushions" className="nav-item">
          <span className="nav-icon"><img src={sofaIcon} alt="" /></span>
          <span className="nav-text">Minderler</span>
        </NavLink>

        <NavLink to="/definitions/payment-methods" className="nav-item">
          <span className="nav-icon"><img src={cardIcon} alt="" /></span>
          <span className="nav-text">Ödeme Yöntemleri</span>
        </NavLink>

        <NavLink to="/register" className="nav-item highlight-item">
          <span className="nav-icon"><img src={addIcon} alt="" /></span>
          <span className="nav-text">Yeni Kullanıcı</span>
        </NavLink>

      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-info">
            <div className="user-avatar">{userInitial}</div>
            <div className="user-details">
              <span className="user-email">{currentUser?.email}</span>
              <span className="user-role">Süper Admin</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn" title="Çıkış">
            <span className="nav-icon"><img src={logoutIcon} alt="" /></span>
            <span className="nav-text">Çıkış</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;