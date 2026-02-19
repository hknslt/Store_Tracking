// src/pages/reports/PersonnelReport.tsx
import { useEffect, useState } from "react";
import { collectionGroup, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { getStores } from "../../services/storeService";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell
} from 'recharts';

// İKONLAR
import userIcon from "../../assets/icons/users.svg";
import moneyIcon from "../../assets/icons/wallet.svg";
import trendIcon from "../../assets/icons/trend-up.svg";
import CrownIcon from "../../assets/icons/crown.svg";
import CupIcon from "../../assets/icons/cup.svg";

interface PersonnelStat {
    id: string;
    name: string;
    storeName: string;
    totalRevenue: number;
    saleCount: number;
    avgBasket: number;
}

const PersonnelReport = () => {
    const [loading, setLoading] = useState(true);

    // Filtre: 'today', 'week', 'month', 'year'
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year'>('month');

    // Veriler
    const [personnelData, setPersonnelData] = useState<PersonnelStat[]>([]);
    const [topPerformer, setTopPerformer] = useState<PersonnelStat | null>(null);

    // KPI
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalSalesCount, setTotalSalesCount] = useState(0);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFilter]);

    const fetchData = async () => {
        try {
            setLoading(true);
            console.log("--- Personel Raporu Hesaplanıyor ---");

            // 1. Mağaza İsimlerini Al (ID -> İsim eşleşmesi için)
            const stores = await getStores();
            const storeMap: Record<string, string> = {};
            stores.forEach(s => { if (s.id) storeMap[s.id] = s.storeName; });

            // 2. Tarih Filtresi
            let startDateStr = "";
            const now = new Date();
            if (dateFilter === 'today') startDateStr = now.toISOString().split('T')[0];
            else if (dateFilter === 'week') { const d = new Date(); d.setDate(d.getDate() - 7); startDateStr = d.toISOString().split('T')[0]; }
            else if (dateFilter === 'month') { const d = new Date(); d.setDate(d.getDate() - 30); startDateStr = d.toISOString().split('T')[0]; }
            else if (dateFilter === 'year') { const d = new Date(); d.setFullYear(d.getFullYear() - 1); startDateStr = d.toISOString().split('T')[0]; }

            // 3. Satışları Çek (Collection Group - Tüm Mağazalar)
            const q = query(collectionGroup(db, "receipts"), where("date", ">=", startDateStr));
            const querySnapshot = await getDocs(q);

            // 4. Hesaplama
            const statsMap: Record<string, PersonnelStat> = {};
            let gTotal = 0;
            let gCount = 0;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const path = doc.ref.path;

                // Sadece Satışlar
                if (!path.includes("sales/") || data.type === 'Alış') return;

                // Tutar Hesapla (Güvenli)
                let amount = Number(data.grandTotal || 0);
                if (amount === 0 && data.items && Array.isArray(data.items)) {
                    amount = data.items.reduce((acc: number, item: any) => {
                        const price = Number(item.price || 0);
                        const qty = Number(item.quantity || 0);
                        const discount = Number(item.discount || 0);
                        return acc + ((price - discount) * qty);
                    }, 0);
                }

                const pId = data.personnelId || "unknown";
                const pName = data.personnelName || "Bilinmeyen Personel";
                const sName = storeMap[data.storeId] || "Genel";

                if (!statsMap[pId]) {
                    statsMap[pId] = {
                        id: pId,
                        name: pName,
                        storeName: sName,
                        totalRevenue: 0,
                        saleCount: 0,
                        avgBasket: 0
                    };
                }

                statsMap[pId].totalRevenue += amount;
                statsMap[pId].saleCount += 1;

                gTotal += amount;
                gCount += 1;
            });

            // 5. Array'e Çevir ve İstatistikleri Tamamla
            let statsArray = Object.values(statsMap).map(p => ({
                ...p,
                avgBasket: p.saleCount > 0 ? p.totalRevenue / p.saleCount : 0
            }));

            // Ciroya Göre Sırala (En yüksek en üstte)
            statsArray = statsArray.sort((a, b) => b.totalRevenue - a.totalRevenue);

            setPersonnelData(statsArray);
            setTopPerformer(statsArray.length > 0 ? statsArray[0] : null);
            setTotalRevenue(gTotal);
            setTotalSalesCount(gCount);
            setLoading(false);

        } catch (error) {
            console.error("Personel raporu hatası:", error);
            setLoading(false);
        }
    };

    const formatMoney = (val: number) => val.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>Personel Verileri Analiz Ediliyor...</div>;

    // Grafik yüksekliği (Personel sayısına göre uzasın)
    const chartHeight = Math.max(350, personnelData.length * 50);

    return (
        <div className="page-container">

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 className="page-title">Personel Performans</h2>
                    <p className="page-subtitle">Satış ekibinin performansı ve prim takibi.</p>
                </div>

                <div style={{ display: 'flex', gap: '5px', background: 'white', padding: '5px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    {['today', 'week', 'month', 'year'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setDateFilter(f as any)}
                            style={{
                                padding: '8px 15px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                                backgroundColor: dateFilter === f ? '#f59e0b' : 'transparent', // Turuncu renk tema
                                color: dateFilter === f ? 'white' : '#64748b', transition: 'all 0.2s'
                            }}
                        >
                            {f === 'today' ? 'Bugün' : f === 'week' ? 'Bu Hafta' : f === 'month' ? 'Bu Ay' : 'Bu Yıl'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI KARTLARI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>

                {/* Lider (Şampiyon) Kartı */}
                <div className="card" style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white', border: 'none', position: 'relative', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '25px'
                }}>
                    <div style={{ position: 'absolute', right: '-0.1px', top: '0px', fontSize: '100px', opacity: 0.15 }}><img src={CupIcon} alt="Cup" style={{ width: '100px', filter: 'invert(1)' }} /></div>
                    <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>DÖNEMİN LİDERİ</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', marginBottom: '5px', lineHeight: '1.2' }}>{topPerformer?.name || "-"}</div>
                    <div>
                        <span style={{ fontSize: '14px', background: 'rgba(255,255,255,0.25)', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>
                            {formatMoney(topPerformer?.totalRevenue || 0)}
                        </span>
                    </div>
                </div>

                {/* Toplam Satış Gücü */}
                <div style={{
                    background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginBottom: '5px' }}>TOPLAM PERSONEL CİROSU</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b' }}>{formatMoney(totalRevenue)}</div>
                    </div>
                    <div style={{ width: '50px', height: '50px', background: '#ecfdf5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={moneyIcon} alt="" style={{ width: '24px', opacity: 0.6 }} />
                    </div>
                </div>

                {/* İşlem Adedi */}
                <div style={{
                    background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginBottom: '5px' }}>TOPLAM SATIŞ SAYISI</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b' }}>{totalSalesCount} <span style={{ fontSize: '16px', color: '#94a3b8' }}>Adet</span></div>
                    </div>
                    <div style={{ width: '50px', height: '50px', background: '#f5f3ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={userIcon} alt="" style={{ width: '24px', opacity: 0.6 }} />
                    </div>
                </div>
            </div>

            {/* GRAFİKLER & TABLO */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '30px', alignItems: 'start' }}>

                {/* 1. Personel Ciro Sıralaması (Bar Chart) */}
                <div className="card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <div style={{ width: '32px', height: '32px', background: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={trendIcon} alt="" style={{ width: '18px', opacity: 0.6 }} />
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155', margin: 0 }}>Ciro Sıralaması</h3>
                    </div>

                    <div style={{ width: '100%', height: chartHeight }}>
                        <ResponsiveContainer>
                            <BarChart
                                layout="vertical"
                                data={personnelData}
                                margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(val: any) => [formatMoney(Number(val)), "Ciro"]}
                                />
                                <Bar dataKey="totalRevenue" radius={[0, 4, 4, 0]} barSize={20}>
                                    {personnelData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#a16c11'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Detaylı Tablo */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#334155' }}>Detaylı Personel Listesi</h3>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="modern-table">
                            <thead>
                                <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '15px', textAlign: 'left', verticalAlign: 'middle' }}>Personel</th>
                                    <th style={{ padding: '15px', textAlign: 'left', verticalAlign: 'middle' }}>Mağaza</th>
                                    <th style={{ padding: '15px', textAlign: 'center', verticalAlign: 'middle' }}>Adet</th>
                                    <th style={{ padding: '15px', textAlign: 'right', verticalAlign: 'middle' }}>Toplam Ciro</th>
                                </tr>
                            </thead>
                            <tbody>
                                {personnelData.map((p, index) => (
                                    <tr key={index} className="hover-row">
                                        <td style={{ padding: '15px', fontWeight: '600', color: '#334155', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {index === 0 && <span style={{ fontSize: '16px' }}><img src={CrownIcon} alt="Kral" style={{ width: '16px', filter: 'invert(0)' }} /></span>}
                                                {p.name}
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px', color: '#64748b', fontSize: '13px', verticalAlign: 'middle' }}>{p.storeName}</td>
                                        <td style={{ padding: '15px', textAlign: 'center', fontWeight: '600', verticalAlign: 'middle' }}>{p.saleCount}</td>
                                        <td style={{ padding: '15px', textAlign: 'right', fontWeight: '700', color: '#f59e0b', verticalAlign: 'middle' }}>
                                            {formatMoney(p.totalRevenue)}
                                        </td>
                                    </tr>
                                ))}
                                {personnelData.length === 0 && (
                                    <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Satış kaydı bulunamadı.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PersonnelReport;