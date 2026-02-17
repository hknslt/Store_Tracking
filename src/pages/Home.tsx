// src/pages/Home.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

// DASHBOARD'LAR
import AdminDashboard from "./Dashboard/AdminDashboard";
import ControlDashboard from "./Dashboard/ControlDashboard"; // 🔥 EKLENDİ

const Home = () => {
  const { userRole, userData, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // 1. Mağaza Müdürü -> Kendi Mağaza Paneline
    if (userRole === 'store_admin') {
      if (userData?.storeId) {
        navigate(`/stores/${userData.storeId}`, { replace: true });
      }
      return;
    }

    // 2. Rapor Kullanıcısı -> Rapor Dashboard'una
    if (userRole === 'report') {
      navigate('/reports/dashboard', { replace: true });
    }
  }, [userRole, userData, loading, navigate]);

  // Yükleme Ekranı
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #10b981', borderRadius: '50%' }} />
      </div>
    );
  }

  // 3. KONTROLCÜ İSE KONTROL DASHBOARD'U GÖSTER
  if (userRole === 'control') {
    return <ControlDashboard />;
  }

  // 4. HİÇBİRİ DEĞİLSE (Yani Admin ise) ADMIN DASHBOARD'U GÖSTER
  return <AdminDashboard />;
};

export default Home;