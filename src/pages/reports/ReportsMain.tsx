// src/pages/Dashboard/ReportsMain.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStores } from "../../services/storeService";
import { motion } from "framer-motion";
import TurkeyMap from "../../components/TurkeyMap";
import type { Store } from "../../types";

// İKONLAR
import chartIcon from "../../assets/icons/trend-up.svg";
import walletIcon from "../../assets/icons/wallet.svg";
import boxIcon from "../../assets/icons/boxes.svg";
import userIcon from "../../assets/icons/users.svg";
// Yeni ikon eklenebilir veya mevcut bir ikon kullanılabilir. Örnek: refresh veya benzeri.
// import compareIcon from "../../assets/icons/refresh.svg"; // Varsa kullanın

// Harita için veri tipi
interface CityStats {
  count: number;
  revenue: number;
}

const ReportsMain = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [cityData, setCityData] = useState<Record<string, CityStats>>({});
  const [loading, setLoading] = useState(true);

  // Verileri Çek
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getStores();
        setStores(data);

        // Hangi şehirde kaç mağaza var ve cirolar ne kadar?
        const stats: Record<string, CityStats> = {};

        data.forEach(store => {
          const city = store.city || "Tanımsız";

          if (city !== "Tanımsız") {
            if (!stats[city]) {
              stats[city] = { count: 0, revenue: 0 };
            }

            // Mağaza Sayısını Artır
            stats[city].count += 1;

            // Ciro Hesabı
            if (store.currentBalance && store.currentBalance.TL) {
              stats[city].revenue += Number(store.currentBalance.TL);
            }
          }
        });

        setCityData(stats);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Rapor Menüleri (5. Buton Eklendi)
  const reportCards = [
    { id: 'sales', title: 'Satış Raporları', desc: 'Ciro, kar/zarar analizi.', icon: chartIcon, path: '/reports/sales', color: '#10b981', bg: '#ecfdf5' },
    { id: 'finance', title: 'Finans & Kasa', desc: 'Nakit akışı ve giderler.', icon: walletIcon, path: '/reports/finance', color: '#3b82f6', bg: '#eff6ff' },
    { id: 'stock', title: 'Stok Analizi', desc: 'Kritik stok ve depo.', icon: boxIcon, path: '/reports/stocks', color: '#8b5cf6', bg: '#f5f3ff' },
    { id: 'personnel', title: 'Personel Performans', desc: 'Hedef ve primler.', icon: userIcon, path: '/reports/personnel', color: '#f59e0b', bg: '#fffbeb' },
    { id: 'compare', title: 'Mağaza Karşılaştırma', desc: 'Şubeleri kıyaslayın.', icon: chartIcon, path: '/reports/compare', color: '#ef4444', bg: '#fef2f2' }, // 5. Buton (Kırmızı tonu)
  ];

  if (loading) return <div className="page-container">Yükleniyor...</div>;

  return (
    <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto' }}> {/* Genişlik artırıldı */}

      <div style={{ marginBottom: '30px' }}>
        <h2 className="page-title" style={{ fontSize: '28px' }}>Raporlar Merkezi</h2>
        <p className="page-subtitle">Toplam {stores.length} mağaza ve bölgesel dağılım analizi.</p>
      </div>

      {/* 1. ÜST BÖLÜM: RAPOR BUTONLARI (Daha Dar ve Üstte) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', // Kart genişliği azaltıldı
        gap: '15px',
        marginBottom: '30px' // Harita ile mesafe
      }}>
        {reportCards.map((report, index) => (
          <motion.div
            key={report.id}
            whileHover={{ y: -3, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(report.path)}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '20px', // Dolgu azaltıldı
              border: '1px solid #f1f5f9',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '140px', // Yükseklik azaltıldı (Daha dar)
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '80px', height: '80px', borderRadius: '50%', background: report.bg, zIndex: 0 }}></div>

            <div style={{ zIndex: 1 }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                backgroundColor: report.bg, color: report.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '10px'
              }}>
                <img src={report.icon} style={{ width: '20px' }} />
              </div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>{report.title}</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.3' }}>{report.desc}</p>
            </div>

            <div style={{ zIndex: 1, display: 'flex', alignItems: 'center', gap: '4px', color: report.color, fontSize: '11px', fontWeight: '600', marginTop: 'auto' }}>
              İncele
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 2. ALT BÖLÜM: HARİTA KARTI */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', height: '550px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}>

        {/* HARİTA BİLEŞENİ */}
        <TurkeyMap cityData={cityData} />

        {/* Harita Üzeri Bilgi Kartı (Sol Alt) */}
        <div style={{
          position: 'absolute', bottom: '20px', left: '20px',
          backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
          padding: '15px', borderRadius: '12px', border: '1px solid #cbd5e1',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: '260px'
        }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' }}>
            🏆 En Yüksek Bakiyeli İller
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(cityData)
              .sort(([, a], [, b]) => b.revenue - a.revenue)
              .slice(0, 3)
              .map(([city, data], idx) => (
                <div key={city} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: idx === 0 ? '#fbbf24' : (idx === 1 ? '#9ca3af' : '#d97706'),
                      color: 'white', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                    }}>{idx + 1}</div>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>{city}</span>
                  </div>
                  <span style={{ color: '#059669', fontWeight: '700', fontSize: '12px' }}>
                    {new Intl.NumberFormat('tr-TR', { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(data.revenue)} ₺
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default ReportsMain;