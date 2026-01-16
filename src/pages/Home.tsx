// src/pages/Home.tsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

// SERVİS
import { getDashboardData, type DashboardData } from "../services/homeService";

import "../App.css";

// İKONLAR
import storeIcon from "../assets/icons/wallet-money.svg";
import walletIcon from "../assets/icons/wallet.svg";
import timeIcon from "../assets/icons/calendar-clock.svg";
import userIcon from "../assets/icons/users.svg";

// RENK TEMASI (Sidebar ile uyumlu)
const THEME = {
  darkGreen: "#052e16",      // Sidebar Arkaplanı
  lightGreen: "#4ade80",     // Parlak Yeşil (Vurgu)
  hoverBg: "#f0fdf4",        // Açık Yeşil (Hover Zemin)
  borderColor: "#166534"     // Koyu Yeşil Çerçeve
};

const Home = () => {
  const { userRole, userData, loading } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Slider State
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;

    // Yönlendirme Mantığı
    if (userRole === 'store_admin') {
      if (userData?.storeId) {
        navigate(`/stores/${userData.storeId}`, { replace: true });
      }
      return;
    }

    if (userRole === 'admin' || userRole === 'control') {
      getDashboardData()
        .then(result => {
          setData(result);
          setIsLoadingData(false);
        })
        .catch(err => {
          console.error(err);
          setIsLoadingData(false);
        });
    }
  }, [userRole, userData, loading, navigate]);

  // Scroll olayını dinleyip noktaları güncelleme
  const handleScroll = () => {
    if (sliderRef.current) {
      const index = Math.round(sliderRef.current.scrollLeft / sliderRef.current.clientWidth);
      setCurrentSlide(index);
    }
  };

  // Butonla Kaydırma Fonksiyonu
  const slideTo = (index: number) => {
    if (sliderRef.current) {
      const width = sliderRef.current.clientWidth;
      sliderRef.current.scrollTo({
        left: width * index,
        behavior: 'smooth'
      });
      setCurrentSlide(index);
    }
  };

  const nextSlide = () => {
    if (currentSlide < 2) slideTo(currentSlide + 1);
    else slideTo(0);
  };

  const prevSlide = () => {
    if (currentSlide > 0) slideTo(currentSlide - 1);
  };

  // 1. Yükleme Durumu veya 
  // 2. 👇 SORUNU ÇÖZEN KISIM: Eğer Mağaza Yöneticisi ise Admin Panelini RENDER ETME, sadece spinner göster.
  if (loading || (isLoadingData && userRole === 'admin') || userRole === 'store_admin') {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          style={{
            width: 40,
            height: 40,
            border: '4px solid #eee',
            borderTop: `4px solid ${THEME.lightGreen}`,
            borderRadius: '50%'
          }}
        />
      </div>
    );
  }

  return (
    <div className="page-container" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '40px' }}>

      {/* HEADER */}
      <div className="modern-header" style={{ marginBottom: '25px' }}>
        <div>
          <h2 style={{ fontSize: '24px', color: '#1e293b' }}>Yönetim Paneli</h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Bugünün operasyonel özeti ({new Date().toLocaleDateString('tr-TR')})</p>
        </div>
        <div className="status-badge neutral">
          👤 {userData?.fullName}
        </div>
      </div>

      {/* --- ANA IZGARA (GRID) --- */}
      <div className="dashboard-layout">

        {/* === SOL SÜTUN (LİSTELER) === */}
        <div className="left-column">

          {/* 1. BUGÜNÜN SATIŞLARI */}
          <div className="card" style={{ marginBottom: '25px' }}>
            <div className="card-header" style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: '#dcfce7', color: '#16a34a', padding: '5px', borderRadius: '6px' }}>🛒</span>
                Bugünün Satışları
              </h3>
              <button onClick={() => navigate('/sales')} className="text-btn">Tümünü Gör →</button>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="modern-table">
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ paddingLeft: '20px' }}>Fiş No</th>
                    <th>Müşteri</th>
                    <th>Mağaza</th>
                    <th style={{ textAlign: 'right', paddingRight: '20px' }}>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.todaySales.map((sale) => (
                    <tr key={sale.id} className="hover-row">
                      <td style={{ padding: '12px 20px', fontWeight: '600', color: '#475569' }}>{sale.receiptNo}</td>
                      <td>{sale.customerName}</td>
                      <td><span className="status-badge neutral" style={{ fontSize: '11px' }}>{sale.storeId ? 'Şube' : 'Merkez'}</span></td>
                      <td style={{ textAlign: 'right', paddingRight: '20px', fontWeight: 'bold', color: '#16a34a' }}>
                        +{Number(sale.grandTotal || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                    </tr>
                  ))}
                  {(!data?.todaySales || data.todaySales.length === 0) && <tr><td colSpan={4} className="empty-cell">Bugün henüz satış yapılmadı.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. BUGÜNÜN ALIŞLARI */}
          <div className="card">
            <div className="card-header" style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '5px', borderRadius: '6px' }}>🚛</span>
                Bugünün Alışları
              </h3>
              <button onClick={() => navigate('/purchases')} className="text-btn">Tümünü Gör →</button>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="modern-table">
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ paddingLeft: '20px' }}>Fiş No</th>
                    <th>İşlemi Yapan</th>
                    <th>Mağaza</th>
                    <th style={{ textAlign: 'right', paddingRight: '20px' }}>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.todayPurchases.map((pur) => (
                    <tr key={pur.id} className="hover-row">
                      <td style={{ padding: '12px 20px', fontWeight: '600', color: '#475569' }}>{pur.receiptNo}</td>
                      <td>{pur.personnelName || '-'}</td>
                      <td><span className="status-badge neutral" style={{ fontSize: '11px' }}>{pur.storeId ? 'Şube' : 'Merkez'}</span></td>
                      <td style={{ textAlign: 'right', paddingRight: '20px', fontWeight: 'bold', color: '#0284c7' }}>
                        {Number(pur.totalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                    </tr>
                  ))}
                  {(!data?.todayPurchases || data.todayPurchases.length === 0) && <tr><td colSpan={4} className="empty-cell">Bugün henüz alış yapılmadı.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* === SAĞ SÜTUN (HIZLI İŞLEMLER & SLIDER ÖZET) === */}
        <div className="right-column" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

          {/* 1. HIZLI İŞLEMLER (SIDEBAR RENGİ) */}
          <div className="card" style={{ padding: '20px', borderTop: `4px solid ${THEME.darkGreen}` }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: THEME.darkGreen, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>⚡ Hızlı Erişim</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

              <QuickBtn title="Mağaza Kasaları" icon={storeIcon} onClick={() => navigate('/finance/cash-registers')} />
              <QuickBtn title="Kasa Hareketleri" icon={walletIcon} onClick={() => navigate('/payments/list')} />
              <QuickBtn title="Puantaj" icon={timeIcon} onClick={() => navigate('/attendance')} />
              <QuickBtn title="Personel" icon={userIcon} onClick={() => navigate('/personnel')} />

            </div>
          </div>

          {/* 2. TEK KARTTA KAYDIRMALI ÖZET (CAROUSEL) */}
          <div className="card" style={{ padding: '0', overflow: 'hidden', position: 'relative', height: '280px', display: 'flex', flexDirection: 'column' }}>

            {/* Header & Navigasyon */}
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee', background: '#fcfcfc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '700' }}>📊 GÜNLÜK ÖZET</h4>

              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <button onClick={prevSlide} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: currentSlide === 0 ? '#ddd' : '#64748b' }}>◀</button>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[0, 1, 2].map(idx => (
                    <div key={idx} onClick={() => slideTo(idx)} style={{
                      width: idx === currentSlide ? '8px' : '4px', height: '4px', borderRadius: '2px',
                      background: idx === currentSlide ? THEME.lightGreen : '#cbd5e1', transition: 'all 0.3s', cursor: 'pointer'
                    }}></div>
                  ))}
                </div>
                <button onClick={nextSlide} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: '#64748b' }}>▶</button>
              </div>
            </div>

            {/* SLIDER ALANI */}
            <div
              ref={sliderRef}
              onScroll={handleScroll}
              style={{
                display: 'flex',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                scrollBehavior: 'smooth',
                flex: 1
              }}
            >

              {/* SLIDE 1: FİNANSAL */}
              <div style={{ flex: '0 0 100%', scrollSnapAlign: 'start', padding: '20px', boxSizing: 'border-box' }}>
                <div style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>💰</span> FİNANSAL HAREKETLER
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <SummaryRow label="Bugünkü Satış" value={`${data?.stats.todayRevenue.toLocaleString()} ₺`} color="#16a34a" />
                  <SummaryRow label="Bugünkü Alış" value={`${data?.stats.todayExpense.toLocaleString()} ₺`} color="#0284c7" />
                  <div style={{ height: '1px', background: '#eee' }}></div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>* Sadece bugünün işlemleri</div>
                </div>
              </div>

              {/* SLIDE 2: İŞLEMLER */}
              <div style={{ flex: '0 0 100%', scrollSnapAlign: 'start', padding: '20px', boxSizing: 'border-box' }}>
                <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 'bold', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>🔢</span> İŞLEM ADETLERİ
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <SummaryRow label="Satış Fişi" value={`${data?.stats.todaySalesCount} Adet`} color="#2563eb" />
                  <SummaryRow label="Alış Fişi" value={`${data?.stats.todayPurchasesCount} Adet`} color="#0284c7" />
                  <div style={{ height: '1px', background: '#eee' }}></div>
                  <SummaryRow label="Aktif Personel" value={data?.stats.totalPersonnel} color="#475569" />
                </div>
              </div>

              {/* SLIDE 3: GENEL */}
              <div style={{ flex: '0 0 100%', scrollSnapAlign: 'start', padding: '20px', boxSizing: 'border-box' }}>
                <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 'bold', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>🏢</span> GENEL ENVANTER
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <SummaryRow label="Toplam Şube" value={data?.stats.totalStores} color="#b45309" />
                  <SummaryRow label="Toplam Ürün" value={data?.stats.totalProducts} color="#b45309" />
                  <div style={{ height: '1px', background: '#eee' }}></div>
                  <div style={{ fontSize: '11px', color: '#92400e', textAlign: 'right' }}>Sistem Aktif ●</div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

// --- ALT BİLEŞENLER ---

const QuickBtn = ({ title, icon, onClick }: any) => (
  <button
    onClick={onClick}
    style={{
      border: `1px solid ${THEME.darkGreen}30`,
      background: 'white',
      borderRadius: '12px',
      padding: '15px',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s',
      color: THEME.darkGreen,
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = THEME.lightGreen;
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = `0 4px 12px ${THEME.lightGreen}40`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = `${THEME.darkGreen}30`;
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
    }}
  >
    <img
      src={icon}
      alt={title}
      style={{
        width: '28px',
        height: '28px',
        objectFit: 'contain'
      }}
    />
    <div style={{ fontSize: '12px', fontWeight: '600' }}>{title}</div>
  </button>
);

const SummaryRow = ({ label, value, color, isBold }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: '13px', color: '#64748b' }}>{label}</span>
    <span style={{ fontSize: '15px', color: color, fontWeight: isBold ? '800' : '600' }}>{value}</span>
  </div>
);

export default Home;