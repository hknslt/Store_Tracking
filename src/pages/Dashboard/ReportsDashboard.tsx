// src/pages/reports/ReportsDashboard.tsx
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';

// İKONLAR (Mevcut ikon setinizden)
import chartIcon from "../../assets/icons/trend-up.svg";
import walletIcon from "../../assets/icons/wallet.svg";
import boxIcon from "../../assets/icons/boxes.svg";
import userIcon from "../../assets/icons/users.svg";
import storeIcon from "../../assets/icons/store.svg";
import awardIcon from "../../assets/icons/cup.svg";

// --- MOCK DATA (Görsel Tasarım İçin Örnek Veriler) ---
// Not: Burayı daha sonra gerçek verilerle (useEffect içinde) besleyebiliriz.
const revenueData = [
    { name: 'Oca', total: 45000 },
    { name: 'Şub', total: 52000 },
    { name: 'Mar', total: 48000 },
    { name: 'Nis', total: 61000 },
    { name: 'May', total: 55000 },
    { name: 'Haz', total: 67000 },
    { name: 'Tem', total: 72000 },
];

const categoryData = [
    { name: 'Mobilya', value: 45 },
    { name: 'Tekstil', value: 25 },
    { name: 'Aksesuar', value: 20 },
    { name: 'Diğer', value: 10 },
];

const COLORS = ['#696cff', '#03c3ec', '#71dd37', '#8592a3']; // Sneat Tema Renkleri

const ReportsDashboard = () => {
    const navigate = useNavigate();

    // Animasyon Varyantları
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="page-container" style={{ background: '#f5f5f9', minHeight: '100vh', padding: '20px' }}>

            {/* HEADER */}
            <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#566a7f', margin: 0 }}>Raporlama Paneli</h2>
                    <p style={{ fontSize: '14px', color: '#a1acb8', margin: '5px 0 0' }}>İşletmenizin genel performans özeti.</p>
                </div>
                <div style={{ background: 'white', padding: '8px 15px', borderRadius: '8px', boxShadow: '0 2px 6px 0 rgba(67, 89, 113, 0.12)', fontSize: '13px', fontWeight: '600', color: '#696cff' }}>
                    📅 Bu Ay: Ocak 2026
                </div>
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >

                {/* --- 1. KPI KARTLARI (Üst Sıra) --- */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>

                    {/* Toplam Ciro */}
                    <motion.div variants={itemVariants} className="sneat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div style={{ background: '#e7e7ff', width: '42px', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={walletIcon} width="24" style={{ filter: 'invert(35%) sepia(45%) saturate(3000%) hue-rotate(230deg)' }} />
                            </div>
                            <span style={{ fontSize: '12px', color: '#71dd37', fontWeight: '600', background: '#e8fadf', padding: '2px 8px', borderRadius: '4px' }}>+12%</span>
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#566a7f', margin: '0 0 5px' }}>₺142.000</h3>
                        <span style={{ fontSize: '14px', color: '#a1acb8' }}>Toplam Ciro (Aylık)</span>
                    </motion.div>

                    {/* Satış Adedi */}
                    <motion.div variants={itemVariants} className="sneat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div style={{ background: '#d7f5fc', width: '42px', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={chartIcon} width="24" style={{ filter: 'invert(60%) sepia(80%) saturate(2000%) hue-rotate(150deg)' }} />
                            </div>
                            <span style={{ fontSize: '12px', color: '#71dd37', fontWeight: '600', background: '#e8fadf', padding: '2px 8px', borderRadius: '4px' }}>+5%</span>
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#566a7f', margin: '0 0 5px' }}>1,250</h3>
                        <span style={{ fontSize: '14px', color: '#a1acb8' }}>Satış Adedi</span>
                    </motion.div>

                    {/* Stok Değeri */}
                    <motion.div variants={itemVariants} className="sneat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div style={{ background: '#fff2d6', width: '42px', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={boxIcon} width="24" style={{ filter: 'invert(70%) sepia(60%) saturate(2000%) hue-rotate(0deg)' }} />
                            </div>
                            <span style={{ fontSize: '12px', color: '#ff3e1d', fontWeight: '600', background: '#ffe0db', padding: '2px 8px', borderRadius: '4px' }}>-2%</span>
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#566a7f', margin: '0 0 5px' }}>₺850.000</h3>
                        <span style={{ fontSize: '14px', color: '#a1acb8' }}>Depo Stok Değeri</span>
                    </motion.div>

                    {/* Personel */}
                    <motion.div variants={itemVariants} className="sneat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div style={{ background: '#e8fadf', width: '42px', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={userIcon} width="24" style={{ filter: 'invert(50%) sepia(80%) saturate(1500%) hue-rotate(80deg)' }} />
                            </div>
                            <span style={{ fontSize: '12px', color: '#696cff', fontWeight: '600', background: '#e7e7ff', padding: '2px 8px', borderRadius: '4px' }}>Aktif</span>
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#566a7f', margin: '0 0 5px' }}>12</h3>
                        <span style={{ fontSize: '14px', color: '#a1acb8' }}>Satış Personeli</span>
                    </motion.div>
                </div>

                {/* --- 2. GRAFİKLER (Orta Sıra) --- */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>

                    {/* Büyük Grafik: Gelir Analizi */}
                    <motion.div variants={itemVariants} className="sneat-card" style={{ minHeight: '400px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ margin: 0, fontSize: '18px', color: '#566a7f', fontWeight: '600' }}>Gelir Analizi</h4>
                            <span style={{ fontSize: '13px', color: '#a1acb8' }}>Yıllık kazanç trendi</span>
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
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Area type="monotone" dataKey="total" stroke="#696cff" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Küçük Grafik: Satış Dağılımı */}
                    <motion.div variants={itemVariants} className="sneat-card">
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ margin: 0, fontSize: '18px', color: '#566a7f', fontWeight: '600' }}>Kategori Satışları</h4>
                            <span style={{ fontSize: '13px', color: '#a1acb8' }}>Haftalık Rapor</span>
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
                                        {categoryData.map((entry, index) => (
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

                {/* --- 3. RAPORLARA GİT (Hızlı Erişim) --- */}
                <motion.div variants={itemVariants}>
                    <h4 style={{ fontSize: '16px', color: '#a1acb8', margin: '0 0 15px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Detaylı Raporlar</h4>
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

// Alt Bileşen: Rapor Kartı
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
                {/* Not: SVG rengini dinamik değiştirmek için filter veya inline svg gerekebilir, şimdilik bg yetiyor */}
            </div>
            <div>
                <h5 style={{ margin: 0, fontSize: '15px', color: '#566a7f', fontWeight: '600' }}>{title}</h5>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#a1acb8' }}>{desc}</p>
            </div>
        </div>
    )
}

export default ReportsDashboard;