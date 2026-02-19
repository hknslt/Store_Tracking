// src/pages/reports/StockReport.tsx
import { useEffect, useState } from "react";
import { collectionGroup, getDocs, query, collection } from "firebase/firestore";
import { db } from "../../firebase";
import { getStores } from "../../services/storeService";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, Legend
} from 'recharts';

// İKONLAR
import boxIcon from "../../assets/icons/boxes.svg";
import checkIcon from "../../assets/icons/verify.svg";
import truckIcon from "../../assets/icons/truck.svg";

interface StoreStockSummary {
    storeName: string;
    totalItems: number;
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

const StockReport = () => {
    const [loading, setLoading] = useState(true);
    const [selectedStoreId, setSelectedStoreId] = useState<string>("");
    const [stores, setStores] = useState<{ id: string, name: string }[]>([]);

    // Grafik Verileri
    const [storeDistribution, setStoreDistribution] = useState<StoreStockSummary[]>([]);
    const [statusData, setStatusData] = useState<any[]>([]);

    // KPI
    const [kpi, setKpi] = useState({
        totalFree: 0,
        totalReserved: 0,
        totalIncoming: 0,
        totalValue: 0 // Adet bazlı toplam
    });

    useEffect(() => {
        initData();
    }, []);

    useEffect(() => {
        if (stores.length > 0) {
            fetchStocks();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStoreId, stores]);

    const initData = async () => {
        const sData = await getStores();
        setStores(sData.map(s => ({ id: s.id!, name: s.storeName })));
    };

    const fetchStocks = async () => {
        try {
            setLoading(true);

            let q;
            if (selectedStoreId) {
                q = query(collection(db, "stores", selectedStoreId, "stocks"));
            } else {
                q = query(collectionGroup(db, "stocks"));
            }

            const snapshot = await getDocs(q);
            const storeMap: Record<string, string> = {};
            stores.forEach(s => storeMap[s.id] = s.name);

            let tFree = 0, tReserved = 0, tIncoming = 0;
            const storeCountMap: Record<string, number> = {};

            snapshot.forEach(doc => {
                const data = doc.data();
                const pathSegments = doc.ref.path.split('/');

                let parentStoreId = "";
                if (pathSegments.length >= 2 && pathSegments[0] === 'stores') {
                    parentStoreId = pathSegments[1];
                } else {
                    parentStoreId = doc.ref.parent.parent?.id || "";
                }

                const sName = storeMap[parentStoreId] || "Bilinmeyen";

                if (selectedStoreId && parentStoreId !== selectedStoreId) return;

                const free = Number(data.freeStock || 0);
                const reserved = Number(data.reservedStock || 0);
                const incoming = Number(data.incomingStock || 0) + Number(data.incomingReservedStock || 0);

                if (free === 0 && reserved === 0 && incoming === 0) return;

                tFree += free;
                tReserved += reserved;
                tIncoming += incoming;

                const totalPhysical = free + reserved;
                storeCountMap[sName] = (storeCountMap[sName] || 0) + totalPhysical;
            });

            // --- VERİ İŞLEME ---

            // Mağaza Dağılımı Grafiği
            const distArray = Object.keys(storeCountMap).map(name => ({
                storeName: name,
                totalItems: storeCountMap[name]
            })).sort((a, b) => b.totalItems - a.totalItems);

            // Pasta Grafik
            const pieD = [
                { name: 'Serbest (Satılabilir)', value: tFree },
                { name: 'Rezerve (Satılmış)', value: tReserved },
                { name: 'Gelecek (Yolda)', value: tIncoming }
            ];

            setStoreDistribution(distArray);
            setStatusData(pieD);
            setKpi({
                totalFree: tFree,
                totalReserved: tReserved,
                totalIncoming: tIncoming,
                totalValue: tFree + tReserved
            });

            setLoading(false);

        } catch (error) {
            console.error("Stok raporu hatası:", error);
            setLoading(false);
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>Stok Verileri Analiz Ediliyor...</div>;

    return (
        <div className="page-container">

            {/* HEADER & FILTER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 className="page-title">Stok Hareket Raporu</h2>
                    <p className="page-subtitle">Depo doluluk oranları ve dağılım analizleri.</p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                        value={selectedStoreId}
                        onChange={(e) => setSelectedStoreId(e.target.value)}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '200px', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="">Tüm Mağazalar</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            {/* KPI KARTLARI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>

                {/* Toplam Fiziksel Stok */}
                <div className="card" style={{ background: 'linear-gradient(135deg, #540ef7 0%, #8b5cf6 100%)', color: 'white', border: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '25px' }}>
                    <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px', textTransform: 'uppercase' }}>TOPLAM FİZİKSEL STOK</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1' }}>{kpi.totalValue} <span style={{ fontSize: '16px', fontWeight: '500' }}>Adet</span></div>
                    <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>Depodaki tüm ürünler</div>
                </div>

                {/* Serbest Stok */}
                <div style={{
                    background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginBottom: '5px' }}>SATILABİLİR (SERBEST)</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', lineHeight: '1', alignItems: '' }}>{kpi.totalFree}</div>
                    </div>
                    <div style={{ width: '50px', height: '50px', background: '#ecfdf5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={checkIcon} alt="" style={{ width: '24px', opacity: 0.6 }} />
                    </div>

                </div>

                {/* Rezerve Stok */}
                <div style={{
                    background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginBottom: '5px' }}>REZERVE (SATILMIŞ)</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b', lineHeight: '1' }}>{kpi.totalReserved}</div>
                    </div>
                    <div style={{ width: '50px', height: '50px', background: '#fffbeb', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={boxIcon} alt="" style={{ width: '24px', opacity: 0.6 }} />
                    </div>
                </div>

                {/* Beklenen Stok */}
                <div style={{
                    background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginBottom: '5px' }}>BEKLENEN (YOLDA)</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#3b82f6', lineHeight: '1' }}>{kpi.totalIncoming}</div>
                    </div>
                    <div style={{ width: '50px', height: '50px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={truckIcon} alt="" style={{ width: '24px', opacity: 0.6 }} />
                    </div>
                </div>
            </div>

            {/* GRAFİKLER */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px', alignItems: 'start' }}>

                {/* 1. Mağaza Stok Dağılımı (Bar Chart) */}
                <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155', marginBottom: '20px' }}>Depo Doluluk Dağılımı</h3>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                            <BarChart data={storeDistribution} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
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
                                />
                                <Bar dataKey="totalItems" name="Toplam Ürün" radius={[0, 4, 4, 0]} barSize={25} fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Stok Statüsü (Pie Chart) */}
                <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155', marginBottom: '20px' }}>Stok Statüsü</h3>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default StockReport;