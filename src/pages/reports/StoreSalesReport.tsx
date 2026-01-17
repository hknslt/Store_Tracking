// src/pages/reports/StoreSalesReport.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collectionGroup, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { getStores } from "../../services/storeService";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, Legend
} from 'recharts';

interface ReportData {
    storeId: string;
    storeName: string;
    totalRevenue: number;
    salesCount: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#f43f5e'];

const StoreSalesReport = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    const [dateFilter, setDateFilter] = useState('month');

    // Tüm Veri
    const [reportData, setReportData] = useState<ReportData[]>([]);
    // Grafik Verisi (İlk 10 + Diğerleri) -> Pasta grafik için
    const [pieData, setPieData] = useState<ReportData[]>([]);

    const [grandTotal, setGrandTotal] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFilter]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Mağazaları Al
            const stores = await getStores();
            const initialData: Record<string, ReportData> = {};

            stores.forEach(s => {
                if (s.id) {
                    initialData[s.id] = {
                        storeId: s.id,
                        storeName: s.storeName,
                        totalRevenue: 0,
                        salesCount: 0
                    };
                }
            });

            // 2. Tarih Filtresi
            let startDateStr = "";
            const now = new Date();
            if (dateFilter === 'today') startDateStr = now.toISOString().split('T')[0];
            else if (dateFilter === 'week') { const d = new Date(); d.setDate(d.getDate() - 7); startDateStr = d.toISOString().split('T')[0]; }
            else if (dateFilter === 'month') { const d = new Date(); d.setDate(d.getDate() - 30); startDateStr = d.toISOString().split('T')[0]; }
            else if (dateFilter === 'year') { const d = new Date(); d.setFullYear(d.getFullYear() - 1); startDateStr = d.toISOString().split('T')[0]; }

            // 3. Sorgu (Sadece Satışlar)
            let q;
            if (dateFilter === 'all') q = query(collectionGroup(db, "receipts"));
            else q = query(collectionGroup(db, "receipts"), where("date", ">=", startDateStr));

            const querySnapshot = await getDocs(q);

            // 4. Hesaplama
            let gTotal = 0;
            let tCount = 0;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const path = doc.ref.path;

                // Sadece 'sales' koleksiyonu altındakileri al (purchases hariç)
                if (!path.includes("sales/") || data.type === 'Alış') return;

                const storeId = data.storeId;

                // Tutar Hesapla (grandTotal yoksa itemlerden topla)
                let amount = Number(data.grandTotal || 0);
                if (amount === 0 && data.items && Array.isArray(data.items)) {
                    amount = data.items.reduce((acc: number, item: any) => {
                        const price = Number(item.price || 0);
                        const qty = Number(item.quantity || 0);
                        const discount = Number(item.discount || 0);
                        return acc + ((price - discount) * qty);
                    }, 0);
                }

                if (storeId && initialData[storeId]) {
                    initialData[storeId].totalRevenue += amount;
                    initialData[storeId].salesCount += 1;
                    gTotal += amount;
                    tCount += 1;
                }
            });

            // --- VERİ HAZIRLIĞI ---
            // 1. Tüm Liste (Tablo ve Bar Grafik için) - Ciroya göre azalan
            const fullList = Object.values(initialData).sort((a, b) => b.totalRevenue - a.totalRevenue);

            // 2. Pasta Grafik İçin Özet (Top 5 + Diğerleri)
            // Pasta grafikte çok dilim olunca okunmaz, o yüzden özetliyoruz.
            let pData: ReportData[] = [];
            if (fullList.length > 5) {
                const top5 = fullList.slice(0, 5);
                const others = fullList.slice(5);
                const othersRev = others.reduce((acc, curr) => acc + curr.totalRevenue, 0);
                const othersCnt = others.reduce((acc, curr) => acc + curr.salesCount, 0);

                pData = [...top5, { storeId: 'others', storeName: 'Diğerleri', totalRevenue: othersRev, salesCount: othersCnt }];
            } else {
                pData = fullList;
            }

            setReportData(fullList);
            setPieData(pData);
            setGrandTotal(gTotal);
            setTotalCount(tCount);
            setLoading(false);

        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const formatMoney = (val: number) => val.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>Veriler Hazırlanıyor...</div>;

    // Bar Grafiğin yüksekliğini mağaza sayısına göre dinamik ayarla (Her mağaza için 50px)
    const dynamicHeight = Math.max(400, reportData.length * 50);

    return (
        <div className="page-container">

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 className="page-title">Mağaza Satış Raporları</h2>
                    <p className="page-subtitle">Şube bazlı performans ve ciro analizi</p>
                </div>

                <div style={{ display: 'flex', gap: '5px', background: 'white', padding: '5px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    {['today', 'week', 'month', 'year', 'all'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setDateFilter(f)}
                            style={{
                                padding: '8px 15px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                                backgroundColor: dateFilter === f ? '#10b981' : 'transparent',
                                color: dateFilter === f ? 'white' : '#64748b', transition: 'all 0.2s'
                            }}
                        >
                            {f === 'today' ? 'Bugün' : f === 'week' ? 'Bu Hafta' : f === 'month' ? 'Bu Ay' : f === 'year' ? 'Bu Yıl' : 'Tümü'}
                        </button>
                    ))}
                </div>

                <button onClick={() => navigate('/reports')} style={{ background: 'white', border: '1px solid #cbd5e1', padding: '8px 15px', borderRadius: '8px', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}>
                    Geri Dön
                </button>
            </div>

            {/* KPI ÖZET */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)', padding: '25px', borderRadius: '16px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 20px rgba(5,46,22,0.3)' }}>
                    <div>
                        <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '5px', textTransform: 'uppercase' }}>TOPLAM CİRO</div>
                        <div style={{ fontSize: '32px', fontWeight: '800' }}>{formatMoney(grandTotal)}</div>
                    </div>
                    <div style={{ fontSize: '36px', opacity: 0.2 }}>💰</div>
                </div>
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginBottom: '5px', textTransform: 'uppercase' }}>TOPLAM İŞLEM</div>
                        <div style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b' }}>{totalCount} <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: '500' }}>Adet</span></div>
                    </div>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🧾</div>
                </div>
            </div>

            {/* --- GRAFİKLER --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px', marginBottom: '30px', alignItems: 'start' }}>

                {/* 1. YATAY BAR CHART (Tüm Mağazalar) */}
                <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155', marginBottom: '20px' }}>📊 Mağaza Ciro Sıralaması</h3>

                    {/* Dinamik Yükseklik: Mağaza sayısı arttıkça grafik uzar */}
                    <div style={{ width: '100%', height: dynamicHeight }}>
                        <ResponsiveContainer>
                            <BarChart
                                layout="vertical" // <-- YATAY MOD
                                data={reportData}
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#e2e8f0" />

                                {/* Y Ekseninde İsimler (Kategori) */}
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="storeName"
                                    type="category"
                                    width={120} // İsimler için soldan boşluk
                                    tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                />

                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(val: any) => [formatMoney(Number(val)), "Ciro"]}
                                />

                                <Bar dataKey="totalRevenue" radius={[0, 6, 6, 0]} barSize={25}>
                                    {reportData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. PASTA GRAFİK (Özet Veri) */}
                <div className="card" style={{ padding: '20px', height: '450px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155', marginBottom: '20px' }}>🍰 Ciro Payı (İlk 5)</h3>
                    <div style={{ width: '100%', height: '100%' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={pieData as any[]}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="totalRevenue"
                                    nameKey="storeName"
                                >
                                    {pieData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: any) => [formatMoney(Number(val)), "Ciro"]} />
                                <Legend
                                    layout="horizontal"
                                    verticalAlign="bottom"
                                    align="center"
                                    wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* DETAYLI TABLO */}
            <div className="card">
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#334155' }}>Detaylı Mağaza Listesi</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="modern-table">
                        <thead>
                            <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' }}>
                                <th style={{ padding: '15px 25px', textAlign: 'left' }}>Mağaza Adı</th>
                                <th style={{ padding: '15px 25px', textAlign: 'center' }}>Satış Adedi</th>
                                <th style={{ padding: '15px 25px', textAlign: 'right' }}>Toplam Ciro</th>
                                <th style={{ padding: '15px 25px', textAlign: 'center' }}>Sistem Payı</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((row, index) => {
                                const share = grandTotal > 0 ? ((row.totalRevenue / grandTotal) * 100).toFixed(1) : "0";
                                return (
                                    <tr key={row.storeId} className="hover-row">
                                        <td style={{ padding: '15px 25px', fontWeight: '600', color: '#334155' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></div>
                                                {row.storeName}
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px 25px', textAlign: 'center', fontWeight: '600' }}>{row.salesCount}</td>
                                        <td style={{ padding: '15px 25px', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>{formatMoney(row.totalRevenue)}</td>
                                        <td style={{ padding: '15px 25px', textAlign: 'center' }}>
                                            <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>%{share}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {reportData.length === 0 && (
                                <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Veri bulunamadı.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default StoreSalesReport;