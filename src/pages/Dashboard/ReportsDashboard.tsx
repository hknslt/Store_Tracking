// src/pages/reports/ReportsDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

// AUTH & FIREBASE
import { useAuth } from "../../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { collectionGroup, getDocs, query, where, collection } from "firebase/firestore";

// İKONLAR
import chartIcon from "../../assets/icons/trend-up.svg";
import walletIcon from "../../assets/icons/wallet.svg";
import boxIcon from "../../assets/icons/boxes.svg";
import userIcon from "../../assets/icons/users.svg";
import storeIcon from "../../assets/icons/store.svg";
import awardIcon from "../../assets/icons/cup.svg";
import logoutIcon from "../../assets/icons/logout.svg";

const COLORS = ['#696cff', '#03c3ec', '#71dd37', '#8592a3', '#ff3e1d'];

const ReportsDashboard = () => {
    const navigate = useNavigate();
    const { currentUser, userData } = useAuth();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        salesCount: 0,
        stockValue: 0, // Mock kalabilir veya hesaplanabilir
        personnelCount: 0
    });

    // Grafik Verileri (Şimdilik statik kalabilir veya geliştirilebilir)
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [categoryData] = useState<any[]>([
        { name: 'Mobilya', value: 40 },
        { name: 'Tekstil', value: 30 },
        { name: 'Aksesuar', value: 20 },
        { name: 'Diğer', value: 10 },
    ]);

    useEffect(() => {
        fetchReportData();
    }, []);

    const fetchReportData = async () => {
        try {
            setLoading(true);

            // 1. Bu Ayın Başlangıcı
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

            // 2. Satışları Çek (Bu ay)
            const salesQuery = query(collectionGroup(db, "receipts"), where("date", ">=", firstDay));
            const salesSnap = await getDocs(salesQuery);

            let totalRev = 0;
            let count = 0;
            const dailyMap: Record<string, number> = {};

            salesSnap.forEach(doc => {
                const data = doc.data();
                if (data.type === 'Alış') return; // Sadece satışlar

                let amount = Number(data.grandTotal || 0);
                // Eğer grandTotal yoksa itemlerden hesapla (Eski veri uyumu)
                if (amount === 0 && data.items) {
                    amount = data.items.reduce((acc: any, i: any) => acc + (i.price * i.quantity), 0);
                }

                totalRev += amount;
                count++;

                // Grafik için gün bazlı topla (YYYY-MM-DD)
                const day = data.date.substring(5); // MM-DD
                dailyMap[day] = (dailyMap[day] || 0) + amount;
            });

            // 3. Personel Sayısı
            const userSnap = await getDocs(collection(db, "personnel"));
            const pCount = userSnap.size;

            // 4. Grafik Verisini Formatla
            const graphData = Object.keys(dailyMap).sort().map(key => ({
                name: key, // 01-21 gibi
                total: dailyMap[key]
            }));

            setStats({
                totalRevenue: totalRev,
                salesCount: count,
                stockValue: 850000, // Stok değeri hesaplaması maliyetli olduğundan şimdilik sabit
                personnelCount: pCount
            });

            if (graphData.length > 0) setRevenueData(graphData);
            else setRevenueData([{ name: 'Veri Yok', total: 0 }]);

            setLoading(false);

        } catch (error) {
            console.error("Rapor hatası:", error);
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        navigate("/login");
    };

    // Animasyon Varyantları
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    if (loading) return <div className="page-container" style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>Veriler Hazırlanıyor...</div>;

    return (
        <div className="page-container" style={{ background: '#f5f5f9', minHeight: '100vh', padding: '20px' }}>

            {/* --- ÜST BAR (HEADER & LOGOUT) --- */}
            <div style={{
                marginBottom: '25px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'white', padding: '15px 25px', borderRadius: '12px',
                boxShadow: '0 2px 6px 0 rgba(67, 89, 113, 0.12)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#696cff', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                        R
                    </div>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#566a7f', margin: 0 }}>Raporlama Paneli</h2>
                        <p style={{ fontSize: '12px', color: '#a1acb8', margin: '2px 0 0' }}>
                            Hoş geldin, <span style={{ color: '#696cff', fontWeight: '600' }}>{userData?.fullName || currentUser?.email}</span>
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: '#f5f5f9', padding: '8px 15px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#696cff' }}>
                        📅 {new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                    </div>

                    <button
                        onClick={handleLogout}
                        style={{
                            background: '#ffe0db', color: '#ff3e1d', border: 'none', padding: '8px 16px', borderRadius: '8px',
                            cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.2s'
                        }}
                    >
                        <img src={logoutIcon} width="16" style={{ filter: 'invert(37%) sepia(93%) saturate(7471%) hue-rotate(356deg) brightness(91%) contrast(135%)' }} />
                        Çıkış
                    </button>
                </div>
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >

                {/* --- 1. KPI KARTLARI (Gerçek Veriler) --- */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>

                    {/* Toplam Ciro */}
                    <motion.div variants={itemVariants} className="sneat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div style={{ background: '#e7e7ff', width: '42px', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={walletIcon} width="24" style={{ filter: 'invert(35%) sepia(45%) saturate(3000%) hue-rotate(230deg)' }} />
                            </div>
                            {/* Artış oranı şimdilik statik, ileride geçen ayla kıyaslanabilir */}
                            <span style={{ fontSize: '12px', color: '#71dd37', fontWeight: '600', background: '#e8fadf', padding: '2px 8px', borderRadius: '4px' }}>Güncel</span>
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#566a7f', margin: '0 0 5px' }}>
                            {stats.totalRevenue.toLocaleString('tr-TR')} ₺
                        </h3>
                        <span style={{ fontSize: '14px', color: '#a1acb8' }}>Toplam Ciro (Bu Ay)</span>
                    </motion.div>

                    {/* Satış Adedi */}
                    <motion.div variants={itemVariants} className="sneat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div style={{ background: '#d7f5fc', width: '42px', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={chartIcon} width="24" style={{ filter: 'invert(60%) sepia(80%) saturate(2000%) hue-rotate(150deg)' }} />
                            </div>
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#566a7f', margin: '0 0 5px' }}>{stats.salesCount}</h3>
                        <span style={{ fontSize: '14px', color: '#a1acb8' }}>Satış Adedi</span>
                    </motion.div>

                    {/* Stok Değeri */}
                    <motion.div variants={itemVariants} className="sneat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div style={{ background: '#fff2d6', width: '42px', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={boxIcon} width="24" style={{ filter: 'invert(70%) sepia(60%) saturate(2000%) hue-rotate(0deg)' }} />
                            </div>
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#566a7f', margin: '0 0 5px' }}>~{stats.stockValue.toLocaleString()} ₺</h3>
                        <span style={{ fontSize: '14px', color: '#a1acb8' }}>Tahmini Stok Değeri</span>
                    </motion.div>

                    {/* Personel */}
                    <motion.div variants={itemVariants} className="sneat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div style={{ background: '#e8fadf', width: '42px', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={userIcon} width="24" style={{ filter: 'invert(50%) sepia(80%) saturate(1500%) hue-rotate(80deg)' }} />
                            </div>
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#566a7f', margin: '0 0 5px' }}>{stats.personnelCount}</h3>
                        <span style={{ fontSize: '14px', color: '#a1acb8' }}>Toplam Personel</span>
                    </motion.div>
                </div>

                {/* --- 2. GRAFİKLER --- */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>

                    {/* Büyük Grafik: Gelir Analizi (Günlük Trend) */}
                    <motion.div variants={itemVariants} className="sneat-card" style={{ minHeight: '400px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ margin: 0, fontSize: '18px', color: '#566a7f', fontWeight: '600' }}>Bu Ayın Satış Trendi</h4>
                            <span style={{ fontSize: '13px', color: '#a1acb8' }}>Günlük ciro hareketleri</span>
                        </div>
                        <div style={{ width: '100%', height: '300px' }}>
                            <ResponsiveContainer>
                                <AreaChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#696cff" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#696cff" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a1acb8', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1acb8', fontSize: 12 }} tickFormatter={(val) => `₺${val / 1000}k`} />
                                    <CartesianGrid vertical={false} stroke="#eff1f3" />
                                    <Tooltip
                                        formatter={(val: any) => val.toLocaleString('tr-TR') + ' ₺'}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="total" stroke="#696cff" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Küçük Grafik: Satış Dağılımı */}
                    <motion.div variants={itemVariants} className="sneat-card">
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ margin: 0, fontSize: '18px', color: '#566a7f', fontWeight: '600' }}>Kategori Dağılımı</h4>
                            <span style={{ fontSize: '13px', color: '#a1acb8' }}>Genel bakış</span>
                        </div>
                        <div style={{ width: '100%', height: '300px' }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {categoryData.map(( index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>

                {/* --- 3. DETAYLI RAPORLAR --- */}
                <motion.div variants={itemVariants}>
                    <h4 style={{ fontSize: '16px', color: '#a1acb8', margin: '0 0 15px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Rapor Modülleri</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>

                        <ReportLinkCard
                            title="Finans & Kasa"
                            desc="Nakit akışı ve ciro"
                            icon={walletIcon}
                            color="#696cff"
                            bg="#e7e7ff"
                            onClick={() => navigate('/reports/finance')}
                        />
                        <ReportLinkCard
                            title="Satış Raporları"
                            desc="Detaylı satış analizi"
                            icon={chartIcon}
                            color="#03c3ec"
                            bg="#d7f5fc"
                            onClick={() => navigate('/reports/sales')}
                        />
                        <ReportLinkCard
                            title="Stok Raporları"
                            desc="Depo ve kritik stok"
                            icon={boxIcon}
                            color="#ff3e1d"
                            bg="#ffe0db"
                            onClick={() => navigate('/reports/stocks')}
                        />
                        <ReportLinkCard
                            title="Personel Performans"
                            desc="Prim ve satış adetleri"
                            icon={awardIcon}
                            color="#71dd37"
                            bg="#e8fadf"
                            onClick={() => navigate('/reports/personnel')}
                        />
                        <ReportLinkCard
                            title="Mağaza Karşılaştırma"
                            desc="Şube bazlı analiz"
                            icon={storeIcon}
                            color="#8592a3"
                            bg="#f2f2f3"
                            onClick={() => navigate('/reports/stores')}
                        />

                    </div>
                </motion.div>

            </motion.div>
        </div>
    );
};

// Alt Bileşen
const ReportLinkCard = ({ title, desc, icon, color, bg, onClick }: any) => {
    return (
        <div
            onClick={onClick}
            className="sneat-card-hover"
            style={{
                background: 'white', padding: '20px', borderRadius: '12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid transparent',
                boxShadow: '0 2px 6px 0 rgba(67, 89, 113, 0.12)', transition: 'all 0.2s'
            }}
        >
            <div style={{ minWidth: '40px', height: '40px', borderRadius: '8px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={icon} width="20" style={{ filter: `drop-shadow(0 0 0 ${color})` }} />
            </div>
            <div>
                <h5 style={{ margin: 0, fontSize: '15px', color: '#566a7f', fontWeight: '600' }}>{title}</h5>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#a1acb8' }}>{desc}</p>
            </div>
        </div>
    )
}

export default ReportsDashboard;