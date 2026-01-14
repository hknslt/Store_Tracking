// src/pages/stores/StoreDashboard.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStoreById } from "../../services/storeService";
import type { Store } from "../../types";
import "../../App.css";
import { motion } from "framer-motion";

// FIREBASE & AUTH
import { auth } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

// LOGO
import logo from "../../assets/logo/Bahçemo_green.png";

const StoreDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userRole } = useAuth();

    const [store, setStore] = useState<Store | null>(null);
    const [loading, setLoading] = useState(true);

    // 👇 GİZLİLİK MODU STATE'İ
    const [showBalance, setShowBalance] = useState(false);

    useEffect(() => {
        if (id) {
            getStoreById(id).then(data => {
                setStore(data);
                setLoading(false);
            });
        }
    }, [id]);

    const go = (path: string) => {
        navigate(path, { state: { preSelectedStoreId: store?.id } });
    };

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/login');
    };

    // 👇 YENİ PARA FORMATLAYICI (Sembollü)
    const formatCurrency = (amount: number = 0, currency: string = 'TL') => {
        if (!showBalance) return "• • •";

        let symbol = "₺";
        if (currency === 'USD') symbol = "$";
        if (currency === 'EUR') symbol = "€";
        if (currency === 'GBP') symbol = "£";

        return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + symbol;
    };

    if (loading) return <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ width: 40, height: 40, border: '4px solid #eee', borderTop: '4px solid #1e703a', borderRadius: '50%' }} /></div>;
    if (!store) return <div className="page-container">Mağaza bulunamadı.</div>;

    const BAHCEMO_GREEN = "#1e703a";

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };
    const itemVariants = {
        hidden: { y: 10, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="page-container" style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', paddingBottom: '40px' }}>

            {/* --- 1. HEADER --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'white', padding: '15px 25px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img src={logo} alt="Bahçemo" style={{ height: '40px' }} />
                    <div style={{ borderLeft: '1px solid #eee', paddingLeft: '15px' }}>
                        <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '18px', fontWeight: '700' }}>{store.storeName}</h2>
                        <span style={{ fontSize: '12px', color: '#7f8c8d', backgroundColor: '#f0f2f5', padding: '2px 8px', borderRadius: '6px' }}>{store.storeCode}</span>
                    </div>
                </div>

                <div>
                    {userRole === 'store_admin' ? (
                        <button onClick={handleLogout} className="btn" style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <span>Çıkış</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        </button>
                    ) : (
                        <button onClick={() => navigate('/stores')} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>← Listeye Dön</button>
                    )}
                </div>
            </div>

            {/* --- 2. FİNANS KARTI (ÇOKLU DÖVİZ) --- */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={{
                    background: `linear-gradient(120deg, ${BAHCEMO_GREEN} 0%, #145a32 100%)`,
                    color: 'white',
                    padding: '25px',
                    borderRadius: '20px',
                    marginBottom: '20px',
                    boxShadow: '0 10px 25px rgba(30, 112, 58, 0.25)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Arka plan dekoru */}
                <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'white', opacity: '0.05', borderRadius: '50%' }}></div>

                {/* Başlık ve Gizleme Butonu */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '15px', opacity: 0.9, fontWeight: '500' }}>Mağaza Kasa Varlığı</span>
                    <button onClick={() => setShowBalance(!showBalance)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                        {showBalance ? '👁️' : '🔒'}
                    </button>
                </div>

                {/* DÖVİZ LİSTESİ (Yan yana kutucuklar) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '15px'
                }}>
                    {/* TL */}
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '15px', borderRadius: '12px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '5px', textTransform: 'uppercase' }}>TÜRK LİRASI</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                            {formatCurrency(store.currentBalance?.TL || 0, 'TL')}
                        </div>
                    </div>

                    {/* USD */}
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '5px' }}>DOLAR (USD)</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                            {formatCurrency(store.currentBalance?.USD || 0, 'USD')}
                        </div>
                    </div>

                    {/* EUR */}
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '5px' }}>EURO (EUR)</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                            {formatCurrency(store.currentBalance?.EUR || 0, 'EUR')}
                        </div>
                    </div>

                    {/* GBP */}
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '5px' }}>STERLİN (GBP)</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                            {formatCurrency(store.currentBalance?.GBP || 0, 'GBP')}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* --- 3. HIZLI İŞLEMLER --- */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ marginBottom: '30px' }}
            >
                <h3 style={{ color: '#34495e', marginBottom: '15px', fontSize: '14px', fontWeight: '600', paddingLeft: '5px' }}>HIZLI İŞLEMLER</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>

                    {/* Hızlı Satış Ekle */}
                    <button
                        onClick={() => go('/sales/add')}
                        style={{
                            background: 'white', border: '1px solid #e0e6ed', padding: '15px', borderRadius: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', fontSize: '15px', fontWeight: '600', color: '#2c3e50',
                            transition: 'transform 0.1s'
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '8px', borderRadius: '8px' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                        </div>
                        Satış Ekle
                    </button>

                    {/* Hızlı Ödeme Ekle */}
                    <button
                        onClick={() => go('/payments/add')}
                        style={{
                            background: 'white', border: '1px solid #e0e6ed', padding: '15px', borderRadius: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', fontSize: '15px', fontWeight: '600', color: '#2c3e50',
                            transition: 'transform 0.1s'
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{ background: '#dcfce7', color: '#16a34a', padding: '8px', borderRadius: '8px' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                        </div>
                        Ödeme Ekle
                    </button>

                </div>
            </motion.div>

            {/* --- 4. TÜM MODÜLLER (GRID) --- */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <h3 style={{ color: '#34495e', marginBottom: '15px', fontSize: '14px', fontWeight: '600', paddingLeft: '5px' }}>MENÜLER</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>

                    <MenuCard title="Satış Yap" path="/sales" color="#3b82f6" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>} go={go} variants={itemVariants} />
                    <MenuCard title="Ödeme & Tahsilat" path="/payments/list" color="#10b981" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>} go={go} variants={itemVariants} />
                    <MenuCard title="Alış (Stok Giriş)" path="/purchases" color="#f59e0b" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>} go={go} variants={itemVariants} />
                    <MenuCard title="Mağaza Stok" path="/store-stocks" color="#8b5cf6" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>} go={go} variants={itemVariants} />
                    <MenuCard title="Personel Listesi" path="/personnel" color="#ec4899" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>} go={go} variants={itemVariants} />
                    <MenuCard title="Puantaj Takibi" path="/attendance" color="#06b6d4" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} go={go} variants={itemVariants} />
                    <MenuCard title="SSH / Servis" path="/ssh/list" color="#f97316" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>} go={go} variants={itemVariants} />
                    <MenuCard
                        title="Müşteri Borçları"
                        path="/debts"
                        color="#e74c3c"
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></svg>}
                        go={go}
                        variants={itemVariants}
                    />
                </div>
            </motion.div>
        </div>
    );
};

// --- Menü Kartı ---
const MenuCard = ({ title, path, color, icon, go, variants }: any) => {
    const [hover, setHover] = useState(false);
    return (
        <motion.div variants={variants} onClick={() => go(path)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #f0f0f0', boxShadow: hover ? `0 10px 20px -5px ${color}30` : '0 2px 5px rgba(0,0,0,0.03)', transform: hover ? 'translateY(-3px)' : 'none', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', backgroundColor: color }}></div>
            <div style={{ color: color, backgroundColor: `${color}15`, width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>{icon}</div>
            <div style={{ fontWeight: '600', color: '#34495e', fontSize: '14px', textAlign: 'center' }}>{title}</div>
        </motion.div>
    );
};

export default StoreDashboard;