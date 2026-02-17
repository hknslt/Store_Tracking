// src/pages/AdminDashboard.tsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";

// GRAFİK KÜTÜPHANESİ
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

// SERVİSLER
import { getDashboardData, getLast7DaysSales, type DashboardData } from "../../services/homeService";
import { getStores } from "../../services/storeService";
import type { Store } from "../../types";

import "../../App.css";

// İKONLAR
import storeIcon from "../../assets/icons/wallet-money.svg";
import timeIcon from "../../assets/icons/calendar-clock.svg";
import commissionIcon from "../../assets/icons/commission.svg";
import invoiceIcon from "../../assets/icons/invoice.svg";
import truckIcon from "../../assets/icons/truck.svg";
import ShopingcartIcon from "../../assets/icons/shopping-cart.svg";

// RENK TEMASI
const THEME = {
    darkGreen: "#052e16",
    lightGreen: "#4ade80",
    bahcemoGreen: "#1e703a", // Ana Yeşil
    hoverBg: "#f0fdf4",
    borderColor: "#166534"
};

const AdminDashboard = () => {
    const { userData } = useAuth();
    const navigate = useNavigate();

    const [data, setData] = useState<DashboardData | null>(null);
    const [stores, setStores] = useState<Store[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // Slider State
    const [currentSlide, setCurrentSlide] = useState(0);
    const sliderRef = useRef<HTMLDivElement>(null);

    // --- VERİ ÇEKME ---
    useEffect(() => {
        const loadAll = async () => {
            try {
                const [dashboardResult, storesResult, chartResult] = await Promise.all([
                    getDashboardData(),
                    getStores(),
                    getLast7DaysSales()
                ]);

                setData(dashboardResult);
                setStores(storesResult);
                setChartData(chartResult);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoadingData(false);
            }
        };
        loadAll();
    }, []);

    // --- OTOMATİK SLIDER ---
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev < 2 ? prev + 1 : 0));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Slide değişince scroll kaydır
    useEffect(() => {
        if (sliderRef.current) {
            const width = sliderRef.current.clientWidth;
            sliderRef.current.scrollTo({ left: width * currentSlide, behavior: 'smooth' });
        }
    }, [currentSlide]);

    // --- SLIDER BUTONLARI (Artık Kullanılıyor) ---
    const nextSlide = () => setCurrentSlide((prev) => (prev < 2 ? prev + 1 : 0));
    const prevSlide = () => setCurrentSlide((prev) => (prev > 0 ? prev - 1 : 2));

    const getStoreName = (storeId: string) => {
        if (!storeId) return "Merkez";
        const store = stores.find(s => s.id === storeId);
        return store ? store.storeName : "Bilinmeyen Şube";
    };

    if (isLoadingData) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    style={{ width: 40, height: 40, border: '4px solid #eee', borderTop: `4px solid ${THEME.lightGreen}`, borderRadius: '50%' }}
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
                                <span style={{ background: '#145a32', color: '#16a34a', padding: '5px', borderRadius: '6px' }}><span className="nav-icon"><img src={ShopingcartIcon} alt="" /></span></span>
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
                                            <td><span className="status-badge neutral" style={{ fontSize: '11px' }}>{getStoreName(sale.storeId)}</span></td>
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
                                <span style={{ background: '#14316b', color: '#0284c7', padding: '5px', borderRadius: '6px' }}><span className="nav-icon"><img src={truckIcon} alt="" /></span></span>
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
                                            <td><span className="status-badge neutral" style={{ fontSize: '11px' }}>{getStoreName(pur.storeId)}</span></td>
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

                {/* === SAĞ SÜTUN === */}
                <div className="right-column" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

                    {/* 1. HIZLI İŞLEMLER */}
                    <div className="card" style={{ padding: '20px', borderTop: `4px solid ${THEME.darkGreen}` }}>
                        <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: THEME.darkGreen, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Hızlı Erişim</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <QuickBtn title="Mağaza Kasaları" icon={storeIcon} onClick={() => navigate('/finance/cash-registers')} />
                            <QuickBtn title="Fiş Takibi" icon={invoiceIcon} onClick={() => navigate('/invoiceTracking')} />
                            <QuickBtn title="Puantaj" icon={timeIcon} onClick={() => navigate('/attendance')} />
                            <QuickBtn title="Primler" icon={commissionIcon} onClick={() => navigate('/commissions')} />
                        </div>
                    </div>



                    {/* 3. GÜNLÜK ÖZET CAROUSEL */}
                    <div className="card" style={{
                        padding: '0',
                        overflow: 'hidden',
                        position: 'relative',
                        height: '280px',
                        display: 'flex',
                        flexDirection: 'column',
                        background: `linear-gradient(135deg, ${THEME.bahcemoGreen} 0%, #064e3b 100%)`,
                        color: 'white',
                        boxShadow: '0 10px 30px -10px rgba(30, 112, 58, 0.5)'
                    }}>

                        <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontSize: '13px', color: '#fff', fontWeight: '700', opacity: 0.9 }}>GÜNLÜK ÖZET</h4>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {/* 🔥 DÜZELTİLDİ: prevSlide butona bağlandı */}
                                <button onClick={prevSlide} style={{ border: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '12px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◀</button>

                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {[0, 1, 2].map(idx => (
                                        <div key={idx} onClick={() => setCurrentSlide(idx)} style={{
                                            width: idx === currentSlide ? '16px' : '6px', height: '6px', borderRadius: '3px',
                                            background: idx === currentSlide ? '#4ade80' : 'rgba(255,255,255,0.3)', transition: 'all 0.3s', cursor: 'pointer'
                                        }}></div>
                                    ))}
                                </div>

                                {/* 🔥 DÜZELTİLDİ: nextSlide butona bağlandı */}
                                <button onClick={nextSlide} style={{ border: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '12px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▶</button>
                            </div>
                        </div>

                        <div
                            ref={sliderRef}
                            style={{
                                display: 'flex', overflowX: 'hidden', scrollSnapType: 'x mandatory', flex: 1, scrollBehavior: 'smooth'
                            }}
                        >
                            {/* SLIDE 1 */}
                            <div style={{ flex: '0 0 100%', scrollSnapAlign: 'start', padding: '20px', boxSizing: 'border-box' }}>
                                <div style={{ fontSize: '12px', color: '#86efac', fontWeight: 'bold', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span>💰</span> FİNANSAL HAREKETLER
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <SummaryRowWhite label="Bugünkü Satış" value={`+${data?.stats.todayRevenue.toLocaleString()} ₺`} />
                                    <SummaryRowWhite label="Bugünkü Alış" value={`-${data?.stats.todayExpense.toLocaleString()} ₺`} />
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                                    <div style={{ fontSize: '11px', color: '#cbd5e1', fontStyle: 'italic', textAlign: 'right' }}>* Sadece bugünün işlemleri</div>
                                </div>
                            </div>

                            {/* SLIDE 2 */}
                            <div style={{ flex: '0 0 100%', scrollSnapAlign: 'start', padding: '20px', boxSizing: 'border-box' }}>
                                <div style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 'bold', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span>🔢</span> İŞLEM ADETLERİ
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <SummaryRowWhite label="Satış Fişi" value={`${data?.stats.todaySalesCount} Adet`} />
                                    <SummaryRowWhite label="Alış Fişi" value={`${data?.stats.todayPurchasesCount} Adet`} />
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                                    <SummaryRowWhite label="Aktif Personel" value={data?.stats.totalPersonnel} />
                                </div>
                            </div>

                            {/* SLIDE 3 */}
                            <div style={{ flex: '0 0 100%', scrollSnapAlign: 'start', padding: '20px', boxSizing: 'border-box' }}>
                                <div style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 'bold', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span>🏢</span> GENEL ENVANTER
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <SummaryRowWhite label="Toplam Şube" value={data?.stats.totalStores} />
                                    <SummaryRowWhite label="Toplam Ürün" value={data?.stats.totalProducts} />
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                                    <div style={{ fontSize: '11px', color: '#86efac', textAlign: 'right' }}>Sistem Aktif ●</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. GRAFİK KARTI */}
                    <div className="card" style={{ padding: '20px', minHeight: '220px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h4 style={{ margin: 0, fontSize: '13px', color: '#334155', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Son 7 Günlük Satış
                            </h4>
                        </div>

                        <div style={{ height: '160px', width: '100%', marginLeft: '-10px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={THEME.lightGreen} stopOpacity={0.4} />
                                            <stop offset="95%" stopColor={THEME.lightGreen} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="name"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: '#94a3b8' }}
                                        dy={10}
                                    />
                                    {/* 🔥 HATA DÜZELTİLDİ: Value tipini 'any' yaptık */}
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                        cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        formatter={(value: any) => [`${Number(value).toLocaleString()} ₺`, 'Satış']}
                                        labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '5px' }}
                                        itemStyle={{ color: THEME.darkGreen, fontWeight: 'bold', fontSize: '14px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        stroke={THEME.bahcemoGreen}
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorTotal)"
                                        activeDot={{ r: 6, strokeWidth: 0, fill: THEME.bahcemoGreen }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
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
            border: `1px solid ${THEME.darkGreen}30`, background: 'white', borderRadius: '12px', padding: '15px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s', color: THEME.darkGreen, boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
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
        <img src={icon} alt={title} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
        <div style={{ fontSize: '12px', fontWeight: '600' }}>{title}</div>
    </button>
);

const SummaryRowWhite = ({ label, value }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', color: '#e2e8f0' }}>{label}</span>
        <span style={{ fontSize: '16px', color: 'white', fontWeight: '700' }}>{value}</span>
    </div>
);

export default AdminDashboard;