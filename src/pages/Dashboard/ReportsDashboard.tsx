// src/pages/reports/ReportsDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { collectionGroup, getDocs, query, where, collection } from "firebase/firestore";
import { getStores } from "../../services/storeService";

// İKONLAR
import logoutIcon from "../../assets/icons/logout.svg";

// BİLEŞENLER
import KpiGrid from "./components/reports/KpiGrid";
import MapSection from "./components/reports/MapSection";
import FloatingReportMenu from "./components/reports/FloatingReportMenu";

// TİPLER
interface CityStats { count: number; revenue: number; }

const ReportsDashboard = () => {
    const navigate = useNavigate();
    const {userData } = useAuth();
    const [loading, setLoading] = useState(true);

    // State'ler
    const [cityData, setCityData] = useState<Record<string, CityStats>>({});
    const [stats, setStats] = useState({
        totalRevenue: 0, salesCount: 0, stockValue: 0, personnelCount: 0
    });

    useEffect(() => { fetchReportData(); }, []);

    const fetchReportData = async () => {
        try {
            setLoading(true);
            const stores = await getStores();
            const storeCityMap: Record<string, string> = {};
            const initialCityStats: Record<string, CityStats> = {};

            stores.forEach(store => {
                if (store.id && store.city) {
                    storeCityMap[store.id] = store.city;
                    const city = store.city;
                    if (!initialCityStats[city]) initialCityStats[city] = { count: 0, revenue: 0 };
                    initialCityStats[city].count += 1;
                }
            });

            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const salesQuery = query(collectionGroup(db, "receipts"), where("date", ">=", firstDay));
            const salesSnap = await getDocs(salesQuery);

            let totalRev = 0;
            let salesCount = 0;

            salesSnap.forEach(doc => {
                const data = doc.data();
                if (data.type === 'Alış') return;
                let amount = Number(data.grandTotal || 0);
                if (amount === 0 && data.items) amount = data.items.reduce((acc: any, i: any) => acc + (i.price * i.quantity), 0);

                totalRev += amount;
                salesCount++;
                const city = storeCityMap[data.storeId];
                if (city && initialCityStats[city]) initialCityStats[city].revenue += amount;
            });

            // 🔥 3. PERSONEL SAYISI (KESİN ÇÖZÜM)
            const userSnap = await getDocs(collection(db, "personnel"));
            let storePersonnelCount = 0;

            userSnap.forEach(doc => {
                const data = doc.data();
                // Eğer personelin bir mağaza ID'si (storeId) varsa o mağaza çalışanıdır.
                // Admin, Control veya Report yetkililerinin storeId'si boştur.
                if (data.storeId && data.storeId.trim() !== "") {
                    storePersonnelCount++;
                }
            });

            // Eğer istersen F12 Konsolundan emin olmak için şu satıra bakabilirsin:
            // console.log(`Toplam Personel Verisi: ${userSnap.size}, Mağaza Çalışanı: ${storePersonnelCount}`);

            setStats({
                totalRevenue: totalRev,
                salesCount: salesCount,
                stockValue: 850000,
                personnelCount: storePersonnelCount // 🔥 Sadece mağaza personellerini yazdırır
            });
            setCityData(initialCityStats);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    const handleLogout = async () => { await signOut(auth); navigate("/login"); };

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f9', color: '#697a8d' }}>
            <div className="spinner"></div>
        </div>
    );

    return (
        <div className="page-container" style={{ maxWidth: '1600px', margin: '0 auto', padding: '20px', minHeight: '100vh', backgroundColor: '#f5f5f9' }}>

            {/* HEADER */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', backgroundColor: 'white', padding: '12px 25px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(67, 89, 113, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #696cff 0%, #4f52e3 100%)', borderRadius: '8px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '18px' }}>R</div>
                    <div>
                        <h1 style={{ fontSize: '16px', fontWeight: '700', color: '#32475c', margin: 0 }}>Yönetim Paneli</h1>
                        <span style={{ fontSize: '12px', color: '#8592a3' }}>Hoş geldiniz, {userData?.fullName}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#697a8d', backgroundColor: '#f5f5f9', padding: '6px 12px', borderRadius: '6px' }}>
                        {new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} Dönemi
                    </span>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }} title="Çıkış Yap">
                        <img src={logoutIcon} width="18" style={{ filter: 'invert(35%) sepia(85%) saturate(3000%) hue-rotate(340deg)' }} />
                    </button>
                </div>
            </header>

            {/* BİLEŞENLER */}
            <KpiGrid stats={stats} />
            <MapSection cityData={cityData} />

            {/* YÜZEN MENÜ (FLOATING DOCK) */}
            <FloatingReportMenu />

        </div>
    );
};

export default ReportsDashboard;