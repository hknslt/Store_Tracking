// src/pages/stores/StoreDashboard.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStoreById } from "../../services/storeService";
import type { Store } from "../../types";
import "../../App.css";
import { motion, AnimatePresence } from "framer-motion";

// FIREBASE & AUTH
import { auth } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

// LOGO
import logo from "../../assets/logo/Bahçemo_green.png";

const StoreDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userRole, currentUser } = useAuth();

    const [store, setStore] = useState<Store | null>(null);
    const [loading, setLoading] = useState(true);

    // 👇 GÖRÜNÜM MODLARI
    const [showBalance, setShowBalance] = useState(false); // Gizlilik (****)
    const [viewMode, setViewMode] = useState<'balance' | 'turnover'>('balance'); // Bakiye mi Ciro mu?

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

    const toggleViewMode = () => {
        setViewMode(prev => prev === 'balance' ? 'turnover' : 'balance');
    };

    // Para Formatlayıcı
    const formatCurrency = (amount: number = 0, currency: string = 'TL', size: 'big' | 'small' = 'small') => {
        if (!showBalance) return "••••••";

        let symbol = "₺";
        if (currency === 'USD') symbol = "$";
        if (currency === 'EUR') symbol = "€";
        if (currency === 'GBP') symbol = "£";

        const val = amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        return (
            <span>
                {val} <span style={{ fontSize: size === 'big' ? '0.6em' : '0.8em', opacity: 0.7 }}>{symbol}</span>
            </span>
        );
    };

    // (Mock) Günlük Ciro Verisi
    const dailyTurnover = store ? (store.currentBalance?.TL || 0) * 0.05 : 0;
    const dailyTransactionCount = 12;

    if (loading) return <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>Yükleniyor...</div>;
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
        <div className="page-container" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '40px' }}>

            {/* --- 1. HEADER (Logo ve Karşılama) --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', backgroundColor: 'white', padding: '15px 25px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Logo Biraz Daha Belirgin */}
                    <img src={logo} alt="Bahçemo" style={{ height: '45px', objectFit: 'contain' }} />

                    <div style={{ borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
                        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '18px', fontWeight: '700' }}>
                            {store.storeName}
                        </h2>
                        <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '13px' }}>
                            Hoş geldin, {currentUser?.displayName || 'Yönetici'} 👋
                        </p>
                    </div>
                </div>

                {userRole === 'store_admin' ? (
                    <button onClick={handleLogout} className="btn" style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Çıkış
                    </button>
                ) : (
                    <button onClick={() => navigate('/stores')} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>← Listeye Dön</button>
                )}
            </div>

            {/* --- 2. AKILLI FİNANS KARTI --- */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={toggleViewMode}
                className="card"
                style={{
                    background: viewMode === 'balance'
                        ? `linear-gradient(135deg, ${BAHCEMO_GREEN} 0%, #0f172a 100%)`
                        : `linear-gradient(135deg, #0f172a 0%, #334155 100%)`,
                    color: 'white',
                    padding: '30px',
                    borderRadius: '24px',
                    marginBottom: '25px',
                    boxShadow: '0 20px 40px -10px rgba(30, 112, 58, 0.4)',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}
            >
                {/* Arka plan deseni */}
                <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>

                {/* Üst Kısım */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px' }}>
                            {viewMode === 'balance'
                                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                            }
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '500', opacity: 0.9, letterSpacing: '0.5px' }}>
                            {viewMode === 'balance' ? 'GÜNCEL KASA VARLIĞI' : 'GÜNLÜK CİRO (BUGÜN)'}
                        </span>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance); }}
                        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: 'white', fontSize: '12px' }}
                    >
                        {showBalance ? 'Gizle' : 'Göster'} {showBalance ? '👁️' : '🔒'}
                    </button>
                </div>

                {/* Orta Kısım */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: '20px 0', zIndex: 2 }}>
                    <AnimatePresence mode="wait">
                        {viewMode === 'balance' ? (
                            <motion.div
                                key="balance"
                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            >
                                <div style={{ fontSize: '42px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '5px' }}>
                                    {formatCurrency(store.currentBalance?.TL || 0, 'TL', 'big')}
                                </div>
                                <div style={{ fontSize: '13px', opacity: 0.7 }}>Toplam Nakit Varlığı</div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="turnover"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            >
                                <div style={{ fontSize: '42px', fontWeight: '800', letterSpacing: '-1px', color: '#38bdf8', marginBottom: '5px' }}>
                                    {formatCurrency(dailyTurnover, 'TL', 'big')}
                                </div>
                                <div style={{ display: 'flex', gap: '15px', fontSize: '13px', opacity: 0.8 }}>
                                    <span>Bugün</span>
                                    <span>•</span>
                                    <span>{dailyTransactionCount} İşlem</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Alt Kısım: Diğer Dövizler */}
                {viewMode === 'balance' && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <div>
                            <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '2px' }}>USD</div>
                            <div style={{ fontSize: '16px', fontWeight: '600' }}>{formatCurrency(store.currentBalance?.USD || 0, 'USD')}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '2px' }}>EUR</div>
                            <div style={{ fontSize: '16px', fontWeight: '600' }}>{formatCurrency(store.currentBalance?.EUR || 0, 'EUR')}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '2px' }}>GBP</div>
                            <div style={{ fontSize: '16px', fontWeight: '600' }}>{formatCurrency(store.currentBalance?.GBP || 0, 'GBP')}</div>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* --- 3. HIZLI İŞLEMLER (Status Widgetlar Yerine Geldi) --- */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: '30px' }}
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                    {/* SATIŞ EKLE BUTONU (Büyük ve Renkli) */}
                    <button
                        onClick={() => go('/sales/add')}
                        style={{
                            background: 'white', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '16px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                            fontSize: '16px', fontWeight: '600', color: '#1e293b',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)'; }}
                    >
                        <div style={{ background: '#dbeafe', color: '#2563eb', padding: '12px', borderRadius: '50%', marginBottom: '5px' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                        </div>
                        Hızlı Satış Ekle
                    </button>

                    {/* ÖDEME EKLE BUTONU */}
                    <button
                        onClick={() => go('/payments/add')}
                        style={{
                            background: 'white', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '16px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                            fontSize: '16px', fontWeight: '600', color: '#1e293b',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)'; }}
                    >
                        <div style={{ background: '#dcfce7', color: '#16a34a', padding: '12px', borderRadius: '50%', marginBottom: '5px' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                        </div>
                        Ödeme / Tahsilat Ekle
                    </button>

                </div>
            </motion.div>

            {/* --- 4. TÜM MODÜLLER (GRID) --- */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <h3 style={{ color: '#64748b', marginBottom: '15px', fontSize: '12px', fontWeight: '700', paddingLeft: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>YÖNETİM MODÜLLERİ</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>

                    <MenuCard title="Satış Listesi" path="/sales" color="#3b82f6" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>} go={go} variants={itemVariants} />
                    <MenuCard title="Stok Giriş (Alış)" path="/purchases" color="#f59e0b" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>} go={go} variants={itemVariants} />
                    <MenuCard title="Kasa Hareketleri" path="/payments/list" color="#10b981" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>} go={go} variants={itemVariants} />
                    <MenuCard title="Stok Durumu" path="/store-stocks" color="#8b5cf6" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>} go={go} variants={itemVariants} />
                    <MenuCard title="Personel" path="/personnel" color="#ec4899" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>} go={go} variants={itemVariants} />
                    <MenuCard title="Puantaj" path="/attendance" color="#06b6d4" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} go={go} variants={itemVariants} />
                    <MenuCard title="SSH / Servis" path="/ssh/list" color="#f97316" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>} go={go} variants={itemVariants} />
                    <MenuCard title="Müşteri Borçları" path="/debts" color="#e74c3c" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></svg>} go={go} variants={itemVariants} />

                </div>
            </motion.div>
        </div>
    );
};

// --- Yardımcı Bileşenler ---

const MenuCard = ({ title, path, color, icon, go, variants }: any) => {
    const [hover, setHover] = useState(false);
    return (
        <motion.div variants={variants} onClick={() => go(path)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #f1f5f9', boxShadow: hover ? `0 10px 25px -5px ${color}30` : '0 2px 5px rgba(0,0,0,0.03)', transform: hover ? 'translateY(-3px)' : 'none', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', backgroundColor: color }}></div>
            <div style={{ color: color, backgroundColor: `${color}10`, width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>{icon}</div>
            <div style={{ fontWeight: '600', color: '#334155', fontSize: '13px', textAlign: 'center' }}>{title}</div>
        </motion.div>
    );
};

export default StoreDashboard;