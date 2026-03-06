// src/pages/debts/DebtDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDebtById } from "../../services/debtService";
import { getPaymentsBySaleId, getPaymentMethods } from "../../services/paymentService";
import type { Debt, PaymentMethod } from "../../types";

import cardIcon from "../../assets/icons/credit-card.svg";

const DebtDetail = () => {
    const { storeId, saleId } = useParams();
    const navigate = useNavigate();

    const [debt, setDebt] = useState<Debt | null>(null);
    const [payments, setPayments] = useState<any[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (storeId && saleId) {
                try {
                    const [debtData, paymentsData, methodsData] = await Promise.all([
                        getDebtById(storeId, saleId),
                        getPaymentsBySaleId(storeId, saleId),
                        getPaymentMethods()
                    ]);

                    setDebt(debtData);
                    setPayments(paymentsData);
                    setPaymentMethods(methodsData);
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            }
        };
        loadData();
    }, [storeId, saleId]);

    const formatMoney = (amount: number) => {
        return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
    };

    const getMethodName = (id: string) => {
        return paymentMethods.find(m => m.id === id)?.name || "Bilinmiyor";
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;
    if (!debt) return <div className="page-container">Borç kaydı bulunamadı.</div>;

    const percentage = Math.min(100, Math.max(0, ((debt.paidAmount || 0) / (debt.totalAmount || 1)) * 100));

    let statusColor = '#e74c3c'; // Kırmızı
    if (debt.status === 'Kısmi Ödeme') statusColor = '#f39c12'; // Turuncu
    if (debt.status === 'Ödendi') statusColor = '#27ae60'; // Yeşil

    return (
        <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto' }}>

            {/* ÜST BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        Borç & Tahsilat Detayı
                        <span style={{ backgroundColor: `${statusColor}20`, color: statusColor, padding: '4px 10px', borderRadius: '8px', fontSize: '12px' }}>
                            {debt.status}
                        </span>
                    </h2>
                    <p style={{ margin: '5px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
                        Müşteri: <strong style={{ color: '#34495e' }}>{debt.customerName}</strong> | Satış Fişi: <strong>{debt.receiptNo}</strong>
                    </p>
                </div>
            </div>

            {/* ÖZET KARTLARI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '25px' }}>
                <div className="card" style={{ padding: '20px', borderTop: '4px solid #3498db' }}>
                    <div style={{ fontSize: '12px', color: '#7f8c8d', fontWeight: 'bold' }}>TOPLAM BORÇ</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50', marginTop: '5px' }}>
                        {formatMoney(debt.totalAmount)}
                    </div>
                </div>
                <div className="card" style={{ padding: '20px', borderTop: '4px solid #27ae60' }}>
                    <div style={{ fontSize: '12px', color: '#7f8c8d', fontWeight: 'bold' }}>ÖDENEN TUTAR</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60', marginTop: '5px' }}>
                        {formatMoney(debt.paidAmount || 0)}
                    </div>
                </div>
                <div className="card" style={{ padding: '20px', borderTop: '4px solid #e74c3c', backgroundColor: debt.remainingAmount > 0 ? '#fff5f5' : 'white' }}>
                    <div style={{ fontSize: '12px', color: '#7f8c8d', fontWeight: 'bold' }}>KALAN BAKİYE</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c', marginTop: '5px' }}>
                        {formatMoney(debt.remainingAmount)}
                    </div>
                </div>
            </div>

            {/* İLERLEME ÇUBUĞU VE TAHSİLAT BUTONU */}
            <div className="card" style={{ padding: '25px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '30px' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#34495e' }}>
                        <span>Ödeme İlerlemesi</span>
                        <span>%{percentage.toFixed(0)}</span>
                    </div>
                    <div style={{ width: '100%', height: '12px', backgroundColor: '#ecf0f1', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: statusColor, transition: 'width 0.5s ease' }}></div>
                    </div>
                </div>

                {debt.remainingAmount > 0.5 && (
                    <button
                        onClick={() => navigate('/payments/add', {
                            state: {
                                preSelectedDebt: {
                                    saleId: debt.saleId,
                                    storeId: debt.storeId,
                                    customerName: debt.customerName,
                                    receiptNo: debt.receiptNo,
                                    remainingAmount: debt.remainingAmount
                                }
                            }
                        })}
                        className="btn btn-primary"
                        style={{ padding: '12px 25px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}
                    >
                        <img src={cardIcon} alt="Tahsilat" style={{ width: '18px', filter: 'brightness(0) invert(1)' }} />
                        Tahsilat Ekle
                    </button>
                )}
            </div>

            {/* ÖDEME GEÇMİŞİ TABLOSU */}
            <div className="card">
                <div className="card-header" style={{ padding: '15px 20px', borderBottom: '1px solid #eee', backgroundColor: '#f8fafc' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#34495e' }}>Geçmiş Ödemeler (Tahsilatlar)</h3>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Tahsilat Fiş No</th>
                                <th>Ödeme Yöntemi</th>
                                <th>İşlemi Yapan</th>
                                <th>Açıklama</th>
                                <th style={{ textAlign: 'right' }}>Tutar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.length > 0 ? (
                                payments.map((payment, idx) => (
                                    <tr key={idx} className="hover-row">
                                        <td style={{ fontWeight: '500' }}>
                                            {new Date(payment.date).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td style={{ color: '#3498db', fontWeight: 'bold' }}>{payment.receiptNo}</td>
                                        <td>
                                            <span style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
                                                {getMethodName(payment.paymentMethodId)} {payment.currency !== 'TL' ? `(${payment.currency})` : ''}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '13px', color: '#475569' }}>{payment.personnelName}</td>
                                        <td style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>{payment.description || "-"}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#27ae60', fontSize: '15px' }}>
                                            +{formatMoney(payment.amount)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        Bu siparişe ait henüz bir ödeme (tahsilat) bulunmuyor.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default DebtDetail;