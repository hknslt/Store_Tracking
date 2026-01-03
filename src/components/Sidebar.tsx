// src/components/Sidebar.tsx
import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <div style={{
      width: '250px',
      height: '100%', 
      backgroundColor: '#2c3e50',
      color: 'white',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      flexShrink: 0 
    }}>
      <h2 style={{ borderBottom: '1px solid #7f8c8d', paddingBottom: '10px' }}>Flexy Stok</h2>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Link to="/" style={linkStyle}>🏠 Ana Sayfa</Link>
        <Link to="/products" style={linkStyle}>📦 Ürün Listesi</Link>
        <Link to="/products/add" style={linkStyle}>➕ Ürün Ekle</Link>
        <Link to="/definitions/groups/list" style={linkStyle}>👥 Gruplar</Link>
        <Link to="/definitions/groups/add" style={linkStyle}>➕ Yeni Grup</Link>
      </nav>

      <div style={{ marginTop: 'auto', fontSize: '12px', color: '#bdc3c7' }}>
        v1.0.0 - Admin Panel
      </div>
    </div>
  );
};

const linkStyle = {
  color: 'white',
  textDecoration: 'none',
  padding: '10px',
  backgroundColor: '#34495e',
  borderRadius: '5px',
  display: 'block'
};

export default Sidebar;