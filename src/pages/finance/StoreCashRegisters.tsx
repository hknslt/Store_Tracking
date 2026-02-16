// src/pages/finance/StoreCashRegisters.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { motion } from "framer-motion";

// İKONLAR
import storeIcon from "../../assets/icons/store.svg";

// Veritabanındaki yapıya ve hesaplamaya uygun tipler
interface CurrencyMap {
    TL: number;
    USD: number;
    EUR: number;
    GBP: number;
}

interface StoreCash {
    id: string;
    name: string;
    balances: CurrencyMap;
}

const StoreCashRegisters = () => {
    const navigate = useNavigate();
    const [stores, setStores] = useState<StoreCash[]>([]);
    const [loading, setLoading] = useState(true);

    // Sadece TL değil, hepsini tutuyoruz
    const [totalSystemBalances, setTotalSystemBalances] = useState<CurrencyMap>({
        TL: 0, USD: 0, EUR: 0, GBP: 0
    });

    useEffect(() => {
        fetchStoreCashData();
    }, []);

    const fetchStoreCashData = async () => {
        try {
            setLoading(true);

            const storesSnap = await getDocs(collection(db, "stores"));
            const storesData: StoreCash[] = [];

            // Genel Toplam Değişkenleri
            let grandTotals = { TL: 0, USD: 0, EUR: 0, GBP: 0 };

            storesSnap.forEach((doc) => {
                const data = doc.data();

                const storeName = data.storeName || data.name || "İsimsiz Mağaza";
                const cb = data.currentBalance || {};

                const balances = {
                    TL: Number(cb.TL || 0),
                    USD: Number(cb.USD || 0),
                    EUR: Number(cb.EUR || 0),
                    GBP: Number(cb.GBP || 0)
                };

                // Her mağazanın bakiyesini genel toplama ekle
                grandTotals.TL += balances.TL;
                grandTotals.USD += balances.USD;
                grandTotals.EUR += balances.EUR;
                grandTotals.GBP += balances.GBP;

                storesData.push({
                    id: doc.id,
                    name: storeName,
                    balances: balances
                });
            });

            // 🔥 A'dan Z'ye İsme Göre Sıralama
            setStores(storesData.sort((a, b) => a.name.localeCompare(b.name, 'tr')));

            setTotalSystemBalances(grandTotals);
            setLoading(false);

        } catch (error) {
            console.error("Mağaza verileri çekilemedi:", error);
            setLoading(false);
        }
    };

    // Para formatlayıcı
    const formatMoney = (amount: number, currency: string) => {
        let suffix = '₺';
        if (currency === 'USD') suffix = '$';
        if (currency === 'EUR') suffix = '€';
        if (currency === 'GBP') suffix = '£';

        return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${suffix}`;
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', height: '80vh', alignItems: 'center' }}>Veriler Yükleniyor...</div>;
    }

    return (
        <div className="page-container">

            {/* --- BAŞLIK & GENEL ÖZET --- */}
            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h2 className="page-title">Mağaza Kasaları</h2>
                    <p className="page-subtitle">Tüm şubelerin anlık nakit durumları</p>
                </div>

                {/* TOPLAM NAKİT KARTI */}
                <div style={{
                    background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
                    padding: '15px 25px',
                    borderRadius: '16px',
                    color: 'white',
                    boxShadow: '0 10px 20px rgba(20, 83, 45, 0.2)',
                    minWidth: '280px',
                    textAlign: 'right'
                }}>
                    <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        TOPLAM SİSTEM NAKİTİ
                    </div>

                    {/* ANA PARA (TL) - BÜYÜK */}
                    <div style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px', lineHeight: '1.2' }}>
                        {formatMoney(totalSystemBalances.TL, 'TL')}
                    </div>

                    {/* DİĞER PARA BİRİMLERİ - KÜÇÜK VE YAN YANA */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '15px',
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', opacity: 0.9 }}>
                            {formatMoney(totalSystemBalances.USD, 'USD')}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', opacity: 0.9 }}>
                            {formatMoney(totalSystemBalances.EUR, 'EUR')}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', opacity: 0.9 }}>
                            {formatMoney(totalSystemBalances.GBP, 'GBP')}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- KART LİSTESİ --- */}
            <div style={{
                display: 'grid',
                // 🔥 minmax(320px) yerine minmax(250px) yaptık ki satıra 4 tane sığabilsin
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '20px'
            }}>
                {stores.map((store, index) => (
                    <motion.div
                        key={store.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }} // Animasyonu da hızlandırdık
                        style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '15px', // Padding'i biraz daralttık
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                        }}
                        onClick={() => navigate(`/stores/${store.id}`)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.08)';
                            e.currentTarget.style.borderColor = '#4ade80';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.02)';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                    >
                        {/* Üst Kısım: Mağaza İsmi */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <div style={{
                                width: '40px', height: '40px', // İkon kutusunu da biraz ufalttık
                                background: '#f0fdf4',
                                borderRadius: '10px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid #dcfce7',
                                flexShrink: 0
                            }}>
                                <img src={storeIcon} alt="" style={{ width: '20px', opacity: 0.8 }} />
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {store.name}
                                </h3>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Şube Kasası</span>
                            </div>
                        </div>

                        {/* Orta Kısım: ÇOKLU BAKİYE LİSTESİ */}
                        <div style={{
                            background: '#f8fafc',
                            borderRadius: '10px',
                            padding: '12px',
                            flex: 1
                        }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>
                                MEVCUT BAKİYELER
                            </div>

                            <BalanceRow label="TL" amount={store.balances.TL} color={store.balances.TL >= 0 ? '#16a34a' : '#dc2626'} suffix="₺" />
                            <BalanceRow label="USD" amount={store.balances.USD} color="#0f172a" suffix="$" />
                            <BalanceRow label="EUR" amount={store.balances.EUR} color="#0f172a" suffix="€" />
                            <BalanceRow label="GBP" amount={store.balances.GBP} color="#0f172a" suffix="£" />
                        </div>

                        <div style={{ marginTop: '12px', textAlign: 'right' }}>
                            <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600' }}>
                                Detaylara Git ➜
                            </span>
                        </div>

                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// Alt Bileşen: Bakiye Satırı
const BalanceRow = ({ label, amount, color, suffix }: any) => {
    const isZero = amount === 0;
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
            opacity: isZero ? 0.3 : 1
        }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>{label}</span>
            <span style={{
                fontSize: '14px',
                fontWeight: '700',
                color: color
            }}>
                {amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {suffix}
            </span>
        </div>
    );
};

export default StoreCashRegisters;