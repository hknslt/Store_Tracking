// src/components/Sidebar.tsx
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "./styles/Sidebar.css";

// LOGO
import logo from "../assets/logo/Bahçemo_white.png";

// İKONLAR
import homeIcon from "../assets/icons/home.svg";
import storeIcon from "../assets/icons/store.svg";
import userIcon from "../assets/icons/users.svg";
import stockIcon from "../assets/icons/boxes.svg";
import productIcon from "../assets/icons/product.svg";
import priceIcon from "../assets/icons/tags.svg";
import salesIcon from "../assets/icons/cart-shopping-fast.svg";
import cartIcon from "../assets/icons/inbox-in.svg";
import walletIcon from "../assets/icons/wallet.svg";
import toolsIcon from "../assets/icons/customer-service.svg";
import timeIcon from "../assets/icons/calendar-clock.svg";
import logoutIcon from "../assets/icons/logout.svg";
import reportsIcon from "../assets/icons/data-report.svg";
import settingsIcon from "../assets/icons/settings.svg";
import commissionIcon from "../assets/icons/commission.svg";
import invoiceIcon from "../assets/icons/invoice.svg";
import financeIcon from "../assets/icons/finance.svg";

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

  // 🔥 KONTROLCÜ (control) ROLÜ DE EKLENDİ, SIDEBAR GİZLENDİ
  if (userRole === 'store_admin' || userRole === 'staff' || userRole === 'report' || userRole === 'control') return null;

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <button className="sidebar-toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? "❯" : "❮"}
      </button>

      <div className="sidebar-header">
        <img src={logo} alt="Logo" className="sidebar-logo" />
        <div className="sidebar-brand-text">YÖNETİM PANELİ</div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className="nav-item" end>
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

        <NavLink to="/commissions" className="nav-item">
          <span className="nav-icon"><img src={commissionIcon} alt="" /></span>
          <span className="nav-text">Personel Primleri</span>
        </NavLink>

        <div className="nav-section"><span>MODÜLLER</span></div>

        <NavLink to="/sales" className="nav-item">
          <span className="nav-icon"><img src={salesIcon} alt="" /></span>
          <span className="nav-text">Satış Listesi</span>
        </NavLink>

        <NavLink to="/purchases" className="nav-item">
          <span className="nav-icon"><img src={cartIcon} alt="" /></span>
          <span className="nav-text">Alış Listesi</span>
        </NavLink>

        <NavLink to="/payments/list" className="nav-item">
          <span className="nav-icon"><img src={financeIcon} alt="" /></span>
          <span className="nav-text">Kasa & Finans</span>
        </NavLink>

        <NavLink to="/debts" className="nav-item">
          <span className="nav-icon"><img src={walletIcon} alt="" /></span>
          <span className="nav-text">Müşteri Borçları</span>
        </NavLink>

        <NavLink to="/reports" className="nav-item">
          <span className="nav-icon"><img src={reportsIcon} alt="" /></span>
          <span className="nav-text">Raporlar</span>
        </NavLink>

        <NavLink to="/ssh/list" className="nav-item">
          <span className="nav-icon"><img src={toolsIcon} alt="" /></span>
          <span className="nav-text">SSH / Servis</span>
        </NavLink>

        <NavLink to="/attendance" className="nav-item">
          <span className="nav-icon"><img src={timeIcon} alt="" /></span>
          <span className="nav-text">Puantaj</span>
        </NavLink>

        <NavLink to="/invoiceTracking" className="nav-item">
          <span className="nav-icon"><img src={invoiceIcon} alt="" /></span>
          <span className="nav-text">Fiş Takip</span>
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

        <div className="nav-section"><span>SİSTEM</span></div>

        <NavLink to="/settings" className="nav-item" style={{ backgroundColor: '#145a32', color: 'white', borderRadius: '8px', marginTop: '10px' }}>
          <span className="nav-icon"><img src={settingsIcon} alt="" style={{ filter: 'brightness(0) invert(1)' }} /></span>
          <span className="nav-text">Sistem Ayarları</span>
        </NavLink>

      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-info">
            <div className="user-avatar">{userInitial}</div>
            <div className="user-details">
              <span className="user-email">{currentUser?.email}</span>
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