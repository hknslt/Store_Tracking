// src/pages/Dashboard/ControlDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { auth, db } from "../../firebase";
import { signOut } from "firebase/auth";
import { collectionGroup, getDocs, query, collection } from "firebase/firestore";
import { motion } from "framer-motion";
import "../../App.css";

// YENİ OLUŞTURDUĞUNUZ ALT BİLEŞENLER
import MiniCalendar from "./components/control/MiniCalendar";
import QuickMenu from "./components/control/QuickMenu";

import logoutIcon from "../../assets/icons/logout.svg";

// TARİH FORMATLAYICI
const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const ControlDashboard = () => {
    const { userData } = useAuth();
    const navigate = useNavigate();

    // Veri State'leri
    const [todayStats, setTodayStats] = useState({ salesCount: 0, purchasesCount: 0 });
    const [purchaseStatuses, setPurchaseStatuses] = useState({ beklemede: 0, onaylandi: 0, uretim: 0, sevkiyat: 0 });

    // Mağazalar ve İşlemler
    const [stores, setStores] = useState<any[]>([]); //   Eklendi
    const [activePurchases, setActivePurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const today = new Date();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate("/login");
        } catch (error) {
            console.error("Çıkış hatası:", error);
        }
    };

    // Mağaza Adı Bulucu
    const getStoreName = (storeId: string) => {
        const store = stores.find(s => s.id === storeId);
        return store ? store.storeName : "Bilinmeyen Mağaza";
    };

    // Verileri Çek
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const todayString = today.toISOString().split('T')[0];

                //   Önce mağazaları çek
                const storesSnap = await getDocs(collection(db, "stores"));
                const storesList = storesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setStores(storesList);

                // Sonra İşlemleri Çek
                const receiptsQuery = query(collectionGroup(db, "receipts"));
                const receiptsSnap = await getDocs(receiptsQuery);

                let sCount = 0; let pCount = 0;
                let sBeklemede = 0; let sOnaylandi = 0; let sUretim = 0; let sSevkiyat = 0;

                // Devam eden işlemleri tutacağımız dizi
                const activeList: any[] = [];

                receiptsSnap.forEach(doc => {
                    const data = doc.data();
                    const isPurchase = data.type === 'Alış';

                    // Bugünün adedi
                    if (data.date === todayString) {
                        if (isPurchase) pCount++;
                        else sCount++;
                    }

                    // Sadece Alış Fişlerini İncele
                    if (isPurchase && data.items && Array.isArray(data.items)) {

                        let hasActiveItem = false;

                        // Ürünlerin durumunu say
                        data.items.forEach((item: any) => {
                            if (item.status === 'Beklemede') { sBeklemede++; hasActiveItem = true; }
                            if (item.status === 'Onaylandı') { sOnaylandi++; hasActiveItem = true; }
                            if (item.status === 'Üretim') { sUretim++; hasActiveItem = true; }
                            if (item.status === 'Sevkiyat') { sSevkiyat++; hasActiveItem = true; }
                        });

                        // Eğer fişin içinde en az 1 tane aktif (tamamlanmamış) ürün varsa tabloya ekle
                        if (hasActiveItem) {
                            activeList.push({
                                id: doc.id,
                                receiptNo: data.receiptNo,
                                storeId: data.storeId,
                                date: data.date,
                                createdAt: data.createdAt || data.date,
                                items: data.items
                            });
                        }
                    }
                });

                // Aktif alışları tarihe göre sırala (En yeni en üstte) ve ilk 5'i al
                activeList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setActivePurchases(activeList.slice(0, 5));

                setTodayStats({ salesCount: sCount, purchasesCount: pCount });
                setPurchaseStatuses({ beklemede: sBeklemede, onaylandi: sOnaylandi, uretim: sUretim, sevkiyat: sSevkiyat });

            } catch (error) {
                console.error("İstatistikler çekilemedi:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Fiş satırına tıklanınca detaya yönlendir
    const goToPurchaseDetail = (purchase: any) => {
        if (purchase.storeId && purchase.id) {
            navigate(`/purchases/${purchase.storeId}/${purchase.id}`, { state: { purchase } });
        }
    };

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

    if (loading) return <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Yükleniyor...</div>;

    const totalActiveItems = purchaseStatuses.beklemede + purchaseStatuses.onaylandi + purchaseStatuses.uretim + purchaseStatuses.sevkiyat;

    return (
        <div className="page-container" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '20px' }}>

            {/* --- HEADER --- */}
            <div className="modern-header" style={{ marginBottom: '25px', backgroundColor: 'white', padding: '20px 25px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div>
                    <h2 style={{ fontSize: '22px', color: '#1e293b', margin: 0 }}>Operasyon & Tedarik Merkezi</h2>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: '5px 0 0' }}>
                        Hoş geldin, <span style={{ fontWeight: '600', color: '#3b82f6' }}>{userData?.fullName}</span>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <button
                        onClick={handleLogout}
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: '0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'}
                    >
                        <img src={logoutIcon} width="16" alt="Çıkış" style={{ filter: 'invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)' }} />
                        Çıkış Yap
                    </button>
                </div>
            </div>

            {/* GRID YERLEŞİMİ */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '25px' }}>

                {/* === SOL SÜTUN === */}
                <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

                    {/* BUGÜNKÜ İŞLEM ÖZETİ (Yan Yana 2 Kart) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                        {/* SATIŞ KARTI */}
                        <motion.div
                            variants={itemVariants}
                            onClick={() => navigate('/sales')}
                            style={{
                                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', padding: '25px',
                                borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                boxShadow: '0 10px 20px rgba(15, 23, 42, 0.2)', cursor: 'pointer', transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            title="Satış listesine git"
                        >
                            <div>
                                <div style={{ fontSize: '12px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Bugün Kesilen Satış</div>
                                <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1' }}>{todayStats.salesCount} <span style={{ fontSize: '14px', fontWeight: '500', opacity: 0.8 }}>Adet</span></div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '50%' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            </div>
                        </motion.div>

                        {/* ALIŞ KARTI */}
                        <motion.div
                            variants={itemVariants}
                            onClick={() => navigate('/purchases')}
                            style={{
                                background: 'linear-gradient(135deg, #0d8a43 0%, #145a32 100%)', color: 'white', padding: '25px',
                                borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)', cursor: 'pointer', transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            title="Alış (Tedarik) listesine git"
                        >
                            <div>
                                <div style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Bugün İşlenen Alış</div>
                                <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1' }}>{todayStats.purchasesCount} <span style={{ fontSize: '14px', fontWeight: '500', opacity: 0.8 }}>Adet</span></div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '50%' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                            </div>
                        </motion.div>

                    </div>

                    {/* TEDARİK DURUM BARI */}
                    <motion.div variants={itemVariants} className="card" style={{ padding: '25px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b', fontWeight: '700' }}>Alış / Tedarik Süreçleri (Tüm Mağazalar)</h3>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Toplam Aktif Ürün: {totalActiveItems}</span>
                        </div>

                        <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '15px', background: '#f1f5f9' }}>
                            <div title="Beklemede" style={{ width: `${(purchaseStatuses.beklemede / (totalActiveItems || 1)) * 100}%`, background: '#3b82f6', transition: 'width 0.5s' }}></div>
                            <div title="Onaylandı" style={{ width: `${(purchaseStatuses.onaylandi / (totalActiveItems || 1)) * 100}%`, background: '#f59e0b', transition: 'width 0.5s' }}></div>
                            <div title="Üretim" style={{ width: `${(purchaseStatuses.uretim / (totalActiveItems || 1)) * 100}%`, background: '#8b5cf6', transition: 'width 0.5s' }}></div>
                            <div title="Sevkiyat" style={{ width: `${(purchaseStatuses.sevkiyat / (totalActiveItems || 1)) * 100}%`, background: '#10b981', transition: 'width 0.5s' }}></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#3b82f6' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span> Bekleyen ({purchaseStatuses.beklemede})</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f59e0b' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span> Onaylanan ({purchaseStatuses.onaylandi})</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#8b5cf6' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }}></span> Üretimde ({purchaseStatuses.uretim})</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Sevkiyatta ({purchaseStatuses.sevkiyat})</div>
                        </div>
                    </motion.div>

                    {/* DEVAM EDEN ALIŞ İŞLEMLERİ TABLOSU */}
                    <motion.div variants={itemVariants} className="card">
                        <div className="card-header" style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ background: '#fef3c7', color: '#d97706', padding: '6px', borderRadius: '6px', display: 'flex' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                                </div>
                                Devam Eden Alış Fişleri
                            </h3>
                            <button onClick={() => navigate('/purchases')} className="text-btn" style={{ color: '#3b82f6', fontWeight: '600' }}>Tümünü Gör →</button>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            <table className="modern-table">
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <th style={{ paddingLeft: '20px' }}>Tarih</th>
                                        <th>Fiş No</th>
                                        <th>Mağaza</th>
                                        <th style={{ textAlign: 'right', paddingRight: '20px' }}>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activePurchases.map((pur, idx) => (
                                        <tr
                                            key={idx}
                                            className="hover-row"
                                            onClick={() => goToPurchaseDetail(pur)}
                                            style={{ cursor: 'pointer' }}
                                            title="Detayları görmek için tıklayın"
                                        >
                                            <td style={{ padding: '12px 20px', color: '#64748b', fontSize: '13px' }}>{formatDate(pur.date)}</td>
                                            <td>
                                                <div style={{ fontWeight: '600', color: '#1e293b' }}>{pur.receiptNo}</div>
                                            
                                            </td>
                                            <td><div style={{ fontSize: '13px', color: '#1e293b', marginTop: '2px' }}>
                                                    {getStoreName(pur.storeId)}
                                                </div></td>
                                            <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                                                <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold' }}>Detay Gör ➜</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {activePurchases.length === 0 && <tr><td colSpan={3} className="empty-cell" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Devam eden aktif fiş bulunamadı.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>

                </motion.div>

                {/* === SAĞ SÜTUN === */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <QuickMenu navigate={navigate} />
                    <MiniCalendar />
                </div>
            </div>
        </div>
    );
};

export default ControlDashboard;