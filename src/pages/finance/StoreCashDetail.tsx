// src/pages/finance/StoreCashDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { getPaymentMethods, getPaymentsByStore } from "../../services/paymentService";
import type { PaymentMethod, PaymentDocument } from "../../types";

import storeIcon from "../../assets/icons/store.svg";
import chevronRightIcon from "../../assets/icons/chevron-right.svg"; //   Sağ ok ikonu eklendi

export default function StoreCashDetail() {
    const { storeId } = useParams();
    const navigate = useNavigate();

    const [storeName, setStoreName] = useState("Mağaza Yükleniyor...");
    const [balancesByMethod, setBalancesByMethod] = useState<Record<string, any>>({});
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [paymentsHistory, setPaymentsHistory] = useState<PaymentDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!storeId) return;
            try {
                // 1. Ödeme yöntemlerini çek
                const methods = await getPaymentMethods();
                setPaymentMethods(methods);

                // 2. Mağaza bilgilerini ve kasasını çek
                const storeRef = doc(db, "stores", storeId);
                const storeSnap = await getDoc(storeRef);
                if (storeSnap.exists()) {
                    const sData = storeSnap.data();
                    setStoreName(sData.storeName || sData.name || "Bilinmeyen Mağaza");

                    const cb = sData.currentBalance || {};
                    const safeBalances: Record<string, any> = {};

                    Object.entries(cb).forEach(([key, val]: any) => {
                        if (typeof val === 'object' && val !== null) {
                            safeBalances[key] = val;
                        }
                    });
                    setBalancesByMethod(safeBalances);
                }

                // 3. Mağazanın son kasa hareketlerini çek
                const history = await getPaymentsByStore(storeId);
                setPaymentsHistory(history);

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [storeId]);

    const getMethodName = (id: string) => paymentMethods.find(m => m.id === id)?.name || "Diğer/Bilinmeyen";

    const formatMoney = (amount: number, cur: string) => {
        const val = Number(amount || 0);
        let suffix = '₺';
        if (cur === 'USD') suffix = '$';
        if (cur === 'EUR') suffix = '€';
        if (cur === 'GBP') suffix = '£';
        return `${val.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${suffix}`;
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '100px' }}>Yükleniyor...</div>;

    return (
        <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                <div>
                    <h2 className="page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={storeIcon} width="24" style={{ opacity: 0.7 }} alt="" />
                        {storeName} - Kasa Detayı
                    </h2>
                </div>
            </div>

            {/* BAKIYELER GRID */}
            <h3 style={{ fontSize: '16px', color: '#1e293b', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>Ödeme Yöntemi Bakiyeleri</h3>

            {Object.keys(balancesByMethod).length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                    Henüz kasa hareketi bulunmuyor.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                    {Object.entries(balancesByMethod).map(([methodId, balances]) => {
                        if (balances.TL === 0 && balances.USD === 0 && balances.EUR === 0 && balances.GBP === 0) return null;

                        return (
                            <div key={methodId} className="card" style={{ padding: '20px', borderTop: '4px solid #3b82f6' }}>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '15px', textTransform: 'uppercase' }}>
                                    {getMethodName(methodId)}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {balances.TL !== 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', color: balances.TL >= 0 ? '#10b981' : '#ef4444' }}>
                                            <span>TL:</span> <span>{formatMoney(balances.TL, 'TL')}</span>
                                        </div>
                                    )}
                                    {balances.USD !== 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                                            <span>USD:</span> <span>{formatMoney(balances.USD, 'USD')}</span>
                                        </div>
                                    )}
                                    {balances.EUR !== 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                                            <span>EUR:</span> <span>{formatMoney(balances.EUR, 'EUR')}</span>
                                        </div>
                                    )}
                                    {balances.GBP !== 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                                            <span>GBP:</span> <span>{formatMoney(balances.GBP, 'GBP')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* GEÇMİŞ İŞLEMLER */}
            <h3 style={{ fontSize: '16px', color: '#1e293b', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Son Kasa Hareketleri</span>
                <button onClick={() => navigate('/payments/list')} className="text-btn" style={{ fontSize: '12px', color: '#3b82f6' }}>Tüm İşlemleri Gör ➜</button>
            </h3>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ paddingLeft: '20px' }}>Tarih</th>
                            <th>Makbuz No</th>
                            <th>İşlem Yapan</th>
                            <th>İşlem Özeti</th>
                            <th style={{ textAlign: 'right' }}>Döviz Tutarı</th>
                            <th style={{ textAlign: 'right' }}>TL Karşılığı</th>
                            <th style={{ width: '40px' }}></th> {/*   Sağ Ok için Sütun */}
                        </tr>
                    </thead>
                    <tbody>
                        {paymentsHistory.length > 0 ? (
                            paymentsHistory.slice(0, 10).map((payment) => {

                                // O fiş içindeki dövizleri toplamak/ayıklamak için yardımcı obje
                                const currencyTotals: Record<string, number> = { USD: 0, EUR: 0, GBP: 0 };

                                payment.items.forEach(item => {
                                    if (item.currency && item.currency !== 'TL') {
                                        // Tahsilat ise artı, Masraf ise eksi
                                        const amt = Number(item.originalAmount || item.amount);
                                        if (item.type === 'Tahsilat' || item.type === 'E/F') currencyTotals[item.currency] += amt;
                                        else currencyTotals[item.currency] -= amt;
                                    }
                                });

                                return (
                                    <tr
                                        key={payment.id}
                                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                                        className="hover-row"
                                        onClick={() => navigate(`/payments/detail/${payment.id}`)} //   YÖNLENDİRME EKLENDİ
                                        title="Makbuz detayını görüntüle"
                                    >
                                        <td style={{ paddingLeft: '20px', color: '#64748b', fontSize: '13px' }}>{new Date(payment.date).toLocaleDateString('tr-TR')}</td>
                                        <td style={{ fontWeight: '600', color: '#1e293b' }}>{payment.receiptNo}</td>
                                        <td>{payment.personnelName}</td>
                                        <td style={{ fontSize: '12px', color: '#475569' }}>
                                            {payment.items.map((item, i) => (
                                                <div key={i}>
                                                    <span style={{ fontWeight: 'bold', color: item.type === 'Tahsilat' ? '#10b981' : item.type === 'Masraf' ? '#ef4444' : '#f59e0b' }}>
                                                        [{item.type}]
                                                    </span> {item.description || item.customerName || "-"} ({getMethodName(item.paymentMethodId)})
                                                </div>
                                            ))}
                                        </td>

                                        {/* DÖVİZ SÜTUNU */}
                                        <td style={{ textAlign: 'right', fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>
                                            {currencyTotals.USD !== 0 && <div>{formatMoney(currencyTotals.USD, 'USD')}</div>}
                                            {currencyTotals.EUR !== 0 && <div>{formatMoney(currencyTotals.EUR, 'EUR')}</div>}
                                            {currencyTotals.GBP !== 0 && <div>{formatMoney(currencyTotals.GBP, 'GBP')}</div>}
                                            {currencyTotals.USD === 0 && currencyTotals.EUR === 0 && currencyTotals.GBP === 0 && <span style={{ color: '#ccc' }}>-</span>}
                                        </td>

                                        {/* TL SÜTUNU */}
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#166534' }}>
                                            {formatMoney(payment.totalAmount, 'TL')}
                                        </td>

                                        {/*   OK İKONU */}
                                        <td style={{ textAlign: 'center', paddingRight: '20px' }}>
                                            <img src={chevronRightIcon} alt="Git" style={{ width: '18px', opacity: 0.4 }} />
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Bu mağazaya ait işlem geçmişi bulunamadı.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}