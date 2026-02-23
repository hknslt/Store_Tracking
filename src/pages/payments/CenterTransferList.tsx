// src/pages/payments/CenterTransferList.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getStores } from "../../services/storeService";
import { getCenterTransfers, toggleCenterTransferCheck, getPaymentMethods } from "../../services/paymentService";
import { useNavigate } from "react-router-dom";
import type { Store, SystemUser, PaymentMethod } from "../../types";
import "../../App.css";

import bankIcon from "../../assets/icons/bank.svg";

const CenterTransferList = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [transfers, setTransfers] = useState<any[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            if (!currentUser) return;
            try {
                const sData = await getStores();
                setStores(sData);

                const mData = await getPaymentMethods();
                setMethods(mData);

                // Yetki kontrolü
                let uData = null;
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists()) uData = userDoc.data() as SystemUser;
                else {
                    const pDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                    if (pDoc.exists()) uData = pDoc.data() as SystemUser;
                }

                if (uData) {
                    const hasAdminAccess = ['admin', 'control', 'report'].includes(uData.role);
                    setIsAdmin(hasAdminAccess);

                    // Verileri çek
                    const data = await getCenterTransfers(hasAdminAccess ? undefined : uData.storeId);
                    setTransfers(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [currentUser]);

    const handleToggleCheck = async (paymentId: string, itemIndex: number, currentStatus: boolean) => {
        if (!isAdmin) return; // Mağaza yetkilisi tıklayamaz (güvenlik önlemi)

        try {
            const newStatus = await toggleCenterTransferCheck(paymentId, itemIndex, currentStatus);

            // Ekranı güncelle
            setTransfers(prev => prev.map(t =>
                t.paymentId === paymentId && t.itemIndex === itemIndex
                    ? { ...t, isCenterChecked: newStatus }
                    : t
            ));
        } catch (error) {
            alert("Durum güncellenirken bir hata oluştu.");
        }
    };

    const getStoreName = (id: string) => stores.find(s => s.id === id)?.storeName || "Bilinmiyor";
    const getMethodName = (id: string) => methods.find(m => m.id === id)?.name || "-";
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('tr-TR');

    if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>Yükleniyor...</div>;

    return (
        <div className="page-container">
            <div className="modern-header" style={{ marginBottom: '25px' }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={bankIcon} alt="Banka" width="24" style={{ filter: 'brightness(0) saturate(100%) invert(35%) sepia(87%) saturate(836%) hue-rotate(354deg) brightness(95%) contrast(94%)' }} />
                        Merkez Transfer Kontrolü
                    </h2>
                    <p style={{ color: '#64748b' }}>
                        {isAdmin ? "Tüm mağazalardan merkeze yapılan transferleri onaylayın." : "Mağazanızdan merkeze yapılan transferlerin onay durumu."}
                    </p>
                </div>
                <button onClick={() => navigate('/payments/list')} className="modern-btn btn-secondary">
                    ← Kasa Hareketlerine Dön
                </button>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="modern-table">
                        <thead>
                            <tr style={{ backgroundColor: '#f1f5f9' }}>
                                {isAdmin && <th>Mağaza</th>}
                                <th>Tarih</th>
                                <th>Makbuz No</th>
                                <th>İşlemi Yapan</th>
                                <th>Açıklama / Yöntem</th>
                                <th style={{ textAlign: 'right' }}>Döviz</th>
                                <th style={{ textAlign: 'right' }}>TL Tutarı</th>
                                <th style={{ textAlign: 'center', width: '100px' }}>Merkez Onayı</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transfers.length > 0 ? (
                                transfers.map((t, idx) => (
                                    <tr key={`${t.paymentId}-${t.itemIndex}`} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: t.isCenterChecked ? '#f0fdf4' : 'white' }}>
                                        {isAdmin && <td style={{ fontWeight: '600', color: '#334155' }}>{getStoreName(t.storeId)}</td>}
                                        <td style={{ color: '#64748b' }}>{formatDate(t.date)}</td>
                                        <td style={{ fontWeight: '700' }}>{t.receiptNo}</td>
                                        <td>{t.personnelName}</td>
                                        <td style={{ fontSize: '12px' }}>
                                            <span style={{ color: '#64748b', fontStyle: 'italic' }}>{t.description || "Transfer"}</span>
                                            <br />
                                            <span style={{ fontWeight: 'bold', color: '#475569' }}>({getMethodName(t.paymentMethodId)})</span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: '500' }}>
                                            {t.currency !== 'TL' ? `${t.originalAmount} ${t.currency}` : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: '800', color: '#ef4444' }}>
                                            {Number(t.amount).toLocaleString('tr-TR')} ₺
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: isAdmin ? 'pointer' : 'not-allowed' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!t.isCenterChecked}
                                                    onChange={() => handleToggleCheck(t.paymentId, t.itemIndex, !!t.isCenterChecked)}
                                                    disabled={!isAdmin}
                                                    style={{ width: '20px', height: '20px', cursor: isAdmin ? 'pointer' : 'not-allowed' }}
                                                />
                                            </label>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        Merkeze transfer işlemi bulunamadı.
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

export default CenterTransferList;