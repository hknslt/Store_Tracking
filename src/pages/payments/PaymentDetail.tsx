// src/pages/payments/PaymentDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPaymentById, getPaymentMethods } from "../../services/paymentService"; //   getPaymentMethods eklendi
import { getStores } from "../../services/storeService";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import type { PaymentDocument, SystemUser, PaymentMethod } from "../../types"; //   PaymentMethod tipi eklendi
import "../../App.css";

const PaymentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [payment, setPayment] = useState<PaymentDocument | null>(null);
    const [storeName, setStoreName] = useState("Yükleniyor...");
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]); //   Ödeme yöntemleri için state
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDetail = async () => {
            if (!id || !currentUser) return;
            try {
                const pData = await getPaymentById(id);
                if (!pData) { navigate('/payments'); return; }
                setPayment(pData);

                //   Mağazaları ve Ödeme Yöntemlerini paralel çekiyoruz
                const [storesData, methodsData] = await Promise.all([
                    getStores(),
                    getPaymentMethods()
                ]);

                setStoreName(storesData.find(s => s.id === pData.storeId)?.storeName || "Bilinmeyen Mağaza");
                setPaymentMethods(methodsData);

                // Yetki Kontrolü
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists()) {
                    const uData = userDoc.data() as SystemUser;
                    setIsAdmin(['admin', 'control'].includes(uData.role));
                } else {
                    const pDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                    if (pDoc.exists() && ['admin', 'control'].includes((pDoc.data() as SystemUser).role)) setIsAdmin(true);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        loadDetail();
    }, [id, currentUser, navigate]);

    //   ID'den ödeme yönteminin ismini bulan yardımcı fonksiyon
    const getMethodName = (methodId: string) => {
        const method = paymentMethods.find(m => m.id === methodId);
        return method ? method.name : "Bilinmeyen"; // Eğer eski kayıtlarda isim direkt yazıldıysa onu da görebilmek için methodId de döndürülebilir ama "Bilinmeyen" daha güvenli
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;
    if (!payment) return <div className="page-container">Makbuz bulunamadı.</div>;

    return (
        <div className="page-container">
            <div className="modern-header" style={{ marginBottom: '20px' }}>
                <div>
                    <h2>Kasa İşlem Detayı</h2>
                    <p>Makbuz No: <strong>{payment.receiptNo}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate('/payments')} className="modern-btn btn-secondary">← Listeye Dön</button>
                    {/* SADECE ADMİNLER DÜZENLEYEBİLİR */}
                    {isAdmin && (
                        <button onClick={() => navigate(`/payments/edit/${payment.id}`)} className="modern-btn btn-primary" style={{ backgroundColor: '#f59e0b' }}>
                            ✏️ İşlemi Düzenle
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <div className="card" style={{ padding: '15px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>MAĞAZA</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>{storeName}</div>
                </div>
                <div className="card" style={{ padding: '15px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>TARİH</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>{new Date(payment.date).toLocaleDateString('tr-TR')}</div>
                </div>
                <div className="card" style={{ padding: '15px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>İŞLEMİ YAPAN</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>{payment.personnelName}</div>
                </div>
                <div className="card" style={{ padding: '15px', borderLeft: '4px solid #10b981' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>TOPLAM TUTAR</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{payment.totalAmount.toLocaleString('tr-TR')} ₺</div>
                </div>
            </div>

            <div className="card">
                <div className="card-header"><h3 style={{ margin: 0 }}>İşlem Kalemleri</h3></div>
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="modern-table">
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th>Tür</th>
                                <th>Müşteri / Açıklama</th>
                                <th>Ödeme Yöntemi</th>
                                <th style={{ textAlign: 'right' }}>Döviz</th>
                                <th style={{ textAlign: 'right' }}>TL Tutarı</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payment.items.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td>
                                        <span className={`status-badge ${item.type === 'Tahsilat' ? 'success' : item.type === 'Masraf' ? 'warning' : 'danger'}`}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: '600', color: '#334155' }}>{item.customerName || "-"}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{item.description} {item.saleReceiptNo && `(Fiş: ${item.saleReceiptNo})`}</div>
                                    </td>
                                    {/*   ID YERİNE İSİM YAZDIRIYORUZ */}
                                    <td style={{ color: '#475569', fontWeight: '500' }}>
                                        {getMethodName(item.paymentMethodId)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: '500', color: '#64748b' }}>
                                        {item.currency !== 'TL' ? `${item.originalAmount} ${item.currency}` : '-'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: item.type === 'Tahsilat' ? '#10b981' : '#ef4444' }}>
                                        {item.type === 'Tahsilat' ? '+' : '-'}{Number(item.amount).toLocaleString('tr-TR')} ₺
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentDetail;