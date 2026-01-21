// src/pages/reports/FinanceReport.tsx
import { useEffect, useState } from "react";
import { collectionGroup, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { getStores } from "../../services/storeService";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, 
} from 'recharts';

// İKONLAR (Lütfen bu dosyaların assets/icons içinde olduğundan emin olun)
import walletIcon from "../../assets/icons/wallet.svg";
import trendIcon from "../../assets/icons/trend-up.svg";
import receiptIcon from "../../assets/icons/receipt.svg";
import cartIcon from "../../assets/icons/inbox-in.svg"; // Veya uygun bir sepet ikonu

interface FinanceData {
    date: string;
    total: number;
}

interface StoreFinance {
    storeName: string;
    totalRevenue: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];

const FinanceReport = () => {
    const [loading, setLoading] = useState(true);

    // Filtre Seçenekleri: 'today', 'week', 'month', 'year'
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year'>('month');

    // Grafikler için State'ler
    const [dailyTrend, setDailyTrend] = useState<FinanceData[]>([]);
    const [storeFinances, setStoreFinances] = useState<StoreFinance[]>([]);

    // KPI State'leri
    const [kpi, setKpi] = useState({
        totalRevenue: 0,
        transactionCount: 0,
        avgBasket: 0
    });

    useEffect(() => {
        fetchFinanceData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFilter]);

    const fetchFinanceData = async () => {
        try {
            setLoading(true);

            // 1. Tarih Filtresini Hazırla
            const now = new Date();
            let startDateStr = "";

            if (dateFilter === 'today') {
                startDateStr = now.toISOString().split('T')[0]; // Sadece bugünün tarihi
            } else if (dateFilter === 'week') {
                const d = new Date(); d.setDate(d.getDate() - 7);
                startDateStr = d.toISOString().split('T')[0];
            } else if (dateFilter === 'month') {
                const d = new Date(); d.setDate(d.getDate() - 30);
                startDateStr = d.toISOString().split('T')[0];
            } else if (dateFilter === 'year') {
                const d = new Date(); d.setFullYear(d.getFullYear() - 1);
                startDateStr = d.toISOString().split('T')[0];
            }

            // 2. Mağaza İsimlerini Çek
            const stores = await getStores();
            const storeMap: Record<string, string> = {};
            stores.forEach(s => { if (s.id) storeMap[s.id] = s.storeName; });

            // 3. Veritabanı Sorgusu
            const q = query(collectionGroup(db, "receipts"), where("date", ">=", startDateStr), orderBy("date", "asc"));
            const querySnapshot = await getDocs(q);

            // 4. Verileri İşle
            const dailyMap: Record<string, number> = {};
            const storeMapTotal: Record<string, number> = {};

            let grandTotal = 0;
            let count = 0;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const path = doc.ref.path;

                // Sadece 'sales' altındakileri al (purchases hariç)
                if (!path.includes("sales/") || data.type === 'Alış') return;

                // Tutarı Hesapla (Güvenli)
                let amount = Number(data.grandTotal || 0);
                if (amount === 0 && data.items && Array.isArray(data.items)) {
                    amount = data.items.reduce((acc: number, item: any) => {
                        const price = Number(item.price || 0);
                        const qty = Number(item.quantity || 0);
                        const discount = Number(item.discount || 0);
                        return acc + ((price - discount) * qty);
                    }, 0);
                }

                grandTotal += amount;
                count++;

                // Günlük Trend
                const dateKey = data.date;
                dailyMap[dateKey] = (dailyMap[dateKey] || 0) + amount;

                // Mağaza Bazlı
                const sName = storeMap[data.storeId] || "Diğer";
                storeMapTotal[sName] = (storeMapTotal[sName] || 0) + amount;
            });

            // 5. State Dönüşümü
            const trendArray = Object.keys(dailyMap).map(date => ({
                date: new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                total: dailyMap[date]
            }));
            setDailyTrend(trendArray);

            const storeArray = Object.keys(storeMapTotal).map(name => ({
                storeName: name,
                totalRevenue: storeMapTotal[name]
            })).sort((a, b) => b.totalRevenue - a.totalRevenue);
            setStoreFinances(storeArray);

            setKpi({
                totalRevenue: grandTotal,
                transactionCount: count,
                avgBasket: count > 0 ? grandTotal / count : 0
            });

            setLoading(false);

        } catch (error) {
            console.error("Hata:", error);
            setLoading(false);
        }
    };

    const formatMoney = (val: number) => val.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>Veriler Hazırlanıyor...</div>;

    // Grafik yüksekliği (Mağaza sayısına göre uzasın)
    const chartHeight = Math.max(350, storeFinances.length * 50);

    return (
        <div className="page-container">

            {/* --- HEADER --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 className="page-title">Finans & Kasa Raporu</h2>
                    <p className="page-subtitle">Şube bazlı nakit akışı ve ciro analizleri.</p>
                </div>

                <div style={{ display: 'flex', gap: '5px', background: 'white', padding: '5px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    {['today', 'week', 'month', 'year'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setDateFilter(f as any)}
                            style={filterBtnStyle(dateFilter === f)}
                        >
                            {f === 'today' ? 'Bugün' : f === 'week' ? 'Bu Hafta' : f === 'month' ? 'Bu Ay' : 'Bu Yıl'}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- KPI KARTLARI --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>

                {/* Toplam Ciro */}
                <div style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                    padding: '25px', borderRadius: '16px', color: 'white',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                }}>
                    <div>
                        <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '5px', letterSpacing: '1px' }}>TOPLAM CİRO</div>
                        <div style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px' }}>{formatMoney(kpi.totalRevenue)}</div>
                    </div>
                    <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={walletIcon} alt="" style={{ width: '24px', filter: 'invert(1)' }} />
                    </div>
                </div>

                {/* İşlem Sayısı */}
                <div style={{
                    background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginBottom: '5px' }}>İŞLEM ADEDİ</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>{kpi.transactionCount}</div>
                    </div>
                    <div style={{ width: '50px', height: '50px', background: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={receiptIcon} alt="" style={{ width: '24px', opacity: 0.6 }} />
                    </div>
                </div>

                {/* Ortalama Sepet */}
                <div style={{
                    background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginBottom: '5px' }}>ORTALAMA SEPET</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>{formatMoney(kpi.avgBasket)}</div>
                    </div>
                    <div style={{ width: '50px', height: '50px', background: '#ecfdf5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={cartIcon} alt="" style={{ width: '24px', opacity: 0.6 }} />
                    </div>
                </div>
            </div>

            {/* --- GRAFİKLER --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px', marginBottom: '30px', alignItems: 'start' }}>

                {/* 1. GÜNLÜK TREND (AREA CHART) */}
                <div className="card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <div style={{ width: '32px', height: '32px', background: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={trendIcon} alt="" style={{ width: '18px' }} />
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155', margin: 0 }}>Ciro Trendi</h3>
                    </div>

                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                            <AreaChart data={dailyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} minTickGap={30} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(val: any) => [formatMoney(Number(val)), "Ciro"]}
                                />
                                <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. MAĞAZA KASALARI (YATAY BAR CHART) */}
                <div className="card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <div style={{ width: '32px', height: '32px', background: '#f0fdf4', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={walletIcon} alt="" style={{ width: '18px', opacity: 0.6 }} />
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155', margin: 0 }}>Mağaza Kasaları</h3>
                    </div>

                    <div style={{ width: '100%', height: chartHeight }}>
                        <ResponsiveContainer>
                            <BarChart
                                layout="vertical" // <-- YATAY MOD
                                data={storeFinances}
                                margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />

                                {/* Y Ekseninde İsimler */}
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="storeName"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                />

                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(val: any) => [formatMoney(Number(val)), "Kasa"]}
                                />

                                <Bar dataKey="totalRevenue" radius={[0, 4, 4, 0]} barSize={20}>
                                    {storeFinances.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* --- DETAYLI TABLO --- */}
            <div className="card">
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#334155' }}>Detaylı Finansal Döküm</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="modern-table">
                        <thead>
                            <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <th style={{ padding: '15px 25px', textAlign: 'left' }}>Mağaza Adı</th>
                                <th style={{ padding: '15px 25px', textAlign: 'right' }}>Dönem Cirosu</th>
                                <th style={{ padding: '15px 25px', textAlign: 'center' }}>Katkı Payı</th>
                                <th style={{ padding: '15px 25px', textAlign: 'center' }}>Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            {storeFinances.map((store, index) => {
                                const share = kpi.totalRevenue > 0 ? ((store.totalRevenue / kpi.totalRevenue) * 100).toFixed(1) : "0";
                                return (
                                    <tr key={index} className="hover-row">
                                        <td style={{ padding: '15px 25px', fontWeight: '600', color: '#334155' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></div>
                                                {store.storeName}
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px 25px', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>
                                            {formatMoney(store.totalRevenue)}
                                        </td>
                                        <td style={{ padding: '15px 25px', textAlign: 'center' }}>
                                            <div style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', display: 'inline-block' }}>
                                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>%{share}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px 25px', textAlign: 'center' }}>
                                            <span style={{ fontSize: '12px', color: '#10b981', background: '#f0fdf4', padding: '4px 10px', borderRadius: '20px' }}>● Aktif</span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {storeFinances.length === 0 && (
                                <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Bu dönemde kayıt bulunamadı.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

// Buton Stili
const filterBtnStyle = (isActive: boolean) => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    backgroundColor: isActive ? '#3b82f6' : 'transparent',
    color: isActive ? 'white' : '#64748b',
    transition: 'all 0.2s',
    boxShadow: isActive ? '0 4px 6px rgba(59, 130, 246, 0.3)' : 'none'
});

export default FinanceReport;