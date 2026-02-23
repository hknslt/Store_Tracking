// src/pages/finance/StoreCashRegisters.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { motion } from "framer-motion";
import { getPaymentMethods } from "../../services/paymentService";
import type { PaymentMethod } from "../../types";

// İKONLAR
import storeIcon from "../../assets/icons/store.svg";

interface CurrencyMap {
    TL: number;
    USD: number;
    EUR: number;
    GBP: number;
}

// Yeni yapıya göre StoreCash arayüzü
interface StoreCash {
    id: string;
    name: string;
    balancesByMethod: Record<string, CurrencyMap>; // { "methodId_Nakit": { TL: 100, USD: 0 }, "methodId_KrediKarti": {...} }
}

const StoreCashRegisters = () => {
    const navigate = useNavigate();
    const [stores, setStores] = useState<StoreCash[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);

    // Tüm mağazaların, tüm ödeme yöntemlerinin döviz bazlı Gelişmiş Toplamı
    const [totalSystemBalances, setTotalSystemBalances] = useState<CurrencyMap>({
        TL: 0, USD: 0, EUR: 0, GBP: 0
    });

    useEffect(() => {
        const init = async () => {
            const methods = await getPaymentMethods();
            setPaymentMethods(methods);
            await fetchStoreCashData();
        };
        init();
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
                const currentBalance = data.currentBalance || {}; // Veritabanındaki yeni kasa objesi

                const safeBalances: Record<string, CurrencyMap> = {};

                // currentBalance objesinin içindeki her bir key'i (paymentMethodId) dolaşıyoruz
                Object.entries(currentBalance).forEach(([key, val]: any) => {
                    // Eski sistem kalıntılarını atlamak için value'nun obje olup olmadığını kontrol et
                    if (typeof val === 'object' && val !== null) {
                        safeBalances[key] = {
                            TL: Number(val.TL || 0),
                            USD: Number(val.USD || 0),
                            EUR: Number(val.EUR || 0),
                            GBP: Number(val.GBP || 0)
                        };

                        // Genel Toplama Ekle
                        grandTotals.TL += safeBalances[key].TL;
                        grandTotals.USD += safeBalances[key].USD;
                        grandTotals.EUR += safeBalances[key].EUR;
                        grandTotals.GBP += safeBalances[key].GBP;
                    }
                });

                storesData.push({
                    id: doc.id,
                    name: storeName,
                    balancesByMethod: safeBalances
                });
            });

            // İsme Göre Sıralama
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

    // Ödeme yöntemi ID'sinden ismini bulan yardımcı fonksiyon
    const getMethodName = (methodId: string) => {
        return paymentMethods.find(m => m.id === methodId)?.name || "Diğer/Bilinmeyen";
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
                    <p className="page-subtitle">Şubelerin ödeme yöntemlerine göre nakit durumları</p>
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
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px'
            }}>
                {stores.map((store, index) => (
                    <motion.div
                        key={store.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '20px',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                        }}
                        onClick={() => navigate(`/finance/cash-registers/${store.id}`)}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                            <div style={{
                                width: '35px', height: '35px',
                                background: '#f0fdf4',
                                borderRadius: '10px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <img src={storeIcon} alt="" style={{ width: '18px', opacity: 0.8 }} />
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                    {store.name}
                                </h3>
                            </div>
                        </div>

                        {/* Orta Kısım: YENİ SİSTEM YÖNTEM BAZLI BAKİYE LİSTESİ */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {Object.keys(store.balancesByMethod).length === 0 ? (
                                <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                                    Kasa hareketi yok.
                                </div>
                            ) : (
                                Object.entries(store.balancesByMethod).map(([methodId, balances]) => {
                                    // Sadece içinde herhangi bir bakiye barındıran yöntemleri göster
                                    if (balances.TL === 0 && balances.USD === 0 && balances.EUR === 0 && balances.GBP === 0) return null;

                                    return (
                                        <div key={methodId} style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase' }}>
                                                {getMethodName(methodId)}
                                            </div>
                                            <BalanceRow label="TL" amount={balances.TL} color={balances.TL >= 0 ? '#16a34a' : '#dc2626'} suffix="₺" />
                                            <BalanceRow label="USD" amount={balances.USD} color="#0f172a" suffix="$" />
                                            <BalanceRow label="EUR" amount={balances.EUR} color="#0f172a" suffix="€" />
                                            <BalanceRow label="GBP" amount={balances.GBP} color="#0f172a" suffix="£" />
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div style={{ marginTop: '15px', textAlign: 'right', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
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

// Alt Bileşen: Bakiye Satırı (Eğer bakiye 0 ise ekranda kalabalık yapmasın diye gizlenir)
const BalanceRow = ({ label, amount, color, suffix }: any) => {
    if (amount === 0) return null;

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px'
        }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>{label}</span>
            <span style={{
                fontSize: '13px',
                fontWeight: '700',
                color: color
            }}>
                {amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {suffix}
            </span>
        </div>
    );
};

export default StoreCashRegisters;