// src/pages/reports/ReportsDashboard.tsx
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

// İKONLAR (Elinizdeki assets klasöründen uygun olanları import edin)
// Yoksa geçici olarak emoji veya benzer ikonlar kullanabiliriz.
import chartIcon from "../../assets/icons/trend-up.svg"; 
import walletIcon from "../../assets/icons/wallet.svg";
import boxIcon from "../../assets/icons/boxes.svg";
import userIcon from "../../assets/icons/users.svg";
import mapIcon from "../../assets/icons/store.svg";

const ReportsDashboard = () => {
  const navigate = useNavigate();

  // Rapor Menüleri Tanımları
  const reportCards = [
    {
      id: 'sales',
      title: 'Satış Raporları',
      desc: 'Günlük, aylık ve yıllık satış analizleri.',
      icon: chartIcon,
      path: '/reports/sales',
      color: '#10b981' // Yeşil
    },
    {
      id: 'finance',
      title: 'Finans & Kasa',
      desc: 'Nakit akışı, gelir-gider dengesi ve mağaza kasa durumları.',
      icon: walletIcon,
      path: '/reports/finance',
      color: '#3b82f6' // Mavi
    },
    {
      id: 'stock',
      title: 'Stok Hareketleri',
      desc: 'Kritik stoklar, stok devir hızı ve depo transferleri.',
      icon: boxIcon,
      path: '/reports/stocks',
      color: '#f59e0b' // Turuncu
    },
    {
      id: 'personnel',
      title: 'Personel Performans',
      desc: 'Satış personeli performansı, prim hak edişleri ve puantaj.',
      icon: userIcon,
      path: '/reports/personnel',
      color: '#8b5cf6' // Mor
    },
    {
      id: 'stores',
      title: 'Mağaza Karşılaştırma',
      desc: 'Şubelerin ciro ve karlılık karşılaştırmaları.',
      icon: mapIcon,
      path: '/reports/stores',
      color: '#ec4899' // Pembe
    }
  ];

  return (
    <div className="page-container">
      
      {/* HEADER */}
      <div style={{ marginBottom: '30px' }}>
        <h2 className="page-title">Raporlar ve Analizler</h2>
        <p className="page-subtitle">İşletmenizin performansını detaylı grafiklerle inceleyin.</p>
      </div>

      {/* KARTLAR GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {reportCards.map((report, index) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => navigate(report.path)}
            style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '25px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                transition: 'all 0.3s',
                position: 'relative',
                overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = report.color;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            {/* Renkli Üst Çizgi */}
            <div style={{
                position:'absolute', top:0, left:0, right:0, height:'4px', 
                backgroundColor: report.color
            }}></div>

            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                <div style={{
                    width:'50px', height:'50px', 
                    borderRadius:'12px', 
                    backgroundColor: `${report.color}15`, // %15 Opaklık
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color: report.color
                }}>
                    {/* SVG İkonu */}
                    <img src={report.icon} alt="" style={{width:'26px', opacity:0.9}} />
                </div>
                <div>
                    <h3 style={{fontSize:'16px', fontWeight:'700', color:'#1e293b', margin:0}}>{report.title}</h3>
                </div>
            </div>

            <p style={{fontSize:'13px', color:'#64748b', lineHeight:'1.5', margin:0}}>
                {report.desc}
            </p>

            <div style={{marginTop:'auto', paddingTop:'15px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'flex-end'}}>
                <span style={{fontSize:'12px', fontWeight:'600', color: report.color, display:'flex', alignItems:'center', gap:'5px'}}>
                    Raporu Görüntüle ➜
                </span>
            </div>

          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ReportsDashboard;