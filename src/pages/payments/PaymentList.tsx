// src/pages/payments/PaymentList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getStores } from "../../services/storeService";
import { getPaymentsByStore } from "../../services/paymentService";

import type { PaymentDocument, Store, SystemUser } from "../../types";
import "../../App.css";

const PaymentList = () => {
    const { currentUser } = useAuth();

    // --- STATE'LER ---
    const [payments, setPayments] = useState<PaymentDocument[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    // Detay satırı açma/kapama
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    // --- VERİ YÜKLEME ---
    useEffect(() => {
        const init = async () => {
            if (!currentUser) return;
            
            // Mağazaları çek
            const sData = await getStores();
            setStores(sData);

            // Kullanıcı yetkisini kontrol et
            const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
            if (userDoc.exists()) {
                const u = userDoc.data() as SystemUser;
                if (u.role === 'admin' || u.role === 'control') {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                    if (u.storeId) setSelectedStoreId(u.storeId);
                }
            }
            setLoading(false);
        };
        init();
    }, [currentUser]);

    // Mağaza değişince listeyi yenile
    useEffect(() => {
        if (selectedStoreId) {
            getPaymentsByStore(selectedStoreId).then(setPayments);
        } else {
            setPayments([]);
        }
    }, [selectedStoreId]);

    // --- HESAPLAMALAR ---
    // (Sadece bilgi amaçlı basit bir özet)
    const calculateSummary = () => {
        let tahsilat = 0;
        let masraf = 0;
        let merkez = 0;

        salesLoop: for (const p of payments) {
            for (const item of p.items) {
                const val = Number(item.amount);
                if (item.type === 'Tahsilat') tahsilat += val;
                else if (item.type === 'Masraf') masraf += val;
                else if (item.type === 'Merkez') merkez += val;
            }
        }
        return { tahsilat, masraf, merkez };
    };

    const summary = calculateSummary();

    // --- YARDIMCILAR ---
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('tr-TR');
    
    const toggleRow = (id: string) => {
        if (expandedRowId === id) setExpandedRowId(null);
        else setExpandedRowId(id);
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title">
                    <h2>Kasa Hareketleri</h2>
                    <p>Ödeme, Tahsilat ve Masraf Listesi</p>
                </div>
                <Link to="/payments/add" className="btn btn-success">+ Yeni İşlem Ekle</Link>
            </div>

            {/* MAĞAZA SEÇİMİ */}
            <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <label style={{ fontWeight: '600', color: '#2c3e50' }}>Mağaza:</label>
                    {isAdmin ? (
                        <select className="form-input" value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)} style={{ maxWidth: '300px' }}>
                            <option value="">-- Seçiniz --</option>{stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                        </select>
                    ) : (
                        <div style={{ fontWeight: 'bold', color: '#2980b9', padding: '10px', backgroundColor: '#ecf0f1', borderRadius: '5px' }}>
                            📍 {stores.find(s => s.id === selectedStoreId)?.storeName || "Mağazam"}
                        </div>
                    )}
                </div>
            </div>

            {/* ÖZET KARTLARI */}
            {selectedStoreId && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                    <div className="card" style={{ backgroundColor: '#e8f8f5', borderLeft: '5px solid #2ecc71', padding: '15px' }}>
                        <div style={{ fontSize: '12px', color: '#555', fontWeight: 'bold' }}>TOPLAM TAHSİLAT</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>+{summary.tahsilat.toFixed(2)} ₺</div>
                    </div>
                    <div className="card" style={{ backgroundColor: '#fef9e7', borderLeft: '5px solid #f1c40f', padding: '15px' }}>
                        <div style={{ fontSize: '12px', color: '#555', fontWeight: 'bold' }}>TOPLAM MASRAF</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f39c12' }}>-{summary.masraf.toFixed(2)} ₺</div>
                    </div>
                    <div className="card" style={{ backgroundColor: '#fdedec', borderLeft: '5px solid #e74c3c', padding: '15px' }}>
                        <div style={{ fontSize: '12px', color: '#555', fontWeight: 'bold' }}>MERKEZE TRANSFER</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c0392b' }}>-{summary.merkez.toFixed(2)} ₺</div>
                    </div>
                </div>
            )}

            {/* LİSTE */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {selectedStoreId ? (
                        <table className="data-table">
                            <thead>
                                <tr style={{ backgroundColor: '#f8f9fa' }}>
                                    <th style={{ width: '5%' }}></th>
                                    <th style={{ width: '15%' }}>Tarih</th>
                                    <th style={{ width: '15%' }}>Makbuz No</th>
                                    <th style={{ width: '20%' }}>İşlemi Yapan</th>
                                    <th>Özet / Açıklama</th>
                                    <th style={{ width: '15%', textAlign: 'right' }}>Toplam Tutar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.length > 0 ? (
                                    payments.map(p => (
                                        <>
                                            {/* ANA SATIR */}
                                            <tr key={p.id} onClick={() => toggleRow(p.id!)} className="hover-row" style={{ cursor: 'pointer', borderBottom: expandedRowId === p.id ? 'none' : '1px solid #eee' }}>
                                                <td style={{ textAlign: 'center', fontSize: '12px', color: '#999' }}>
                                                    {expandedRowId === p.id ? '▼' : '▶'}
                                                </td>
                                                <td>{formatDate(p.date)}</td>
                                                <td style={{ fontWeight: 'bold', color: '#2c3e50' }}>{p.receiptNo}</td>
                                                <td>{p.personnelName}</td>
                                                <td style={{ fontSize: '12px', color: '#777', fontStyle: 'italic' }}>
                                                    {p.items.length} adet işlem içeriyor...
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                                    {p.totalAmount.toFixed(2)} ₺
                                                </td>
                                            </tr>

                                            {/* DETAY SATIRI */}
                                            {expandedRowId === p.id && (
                                                <tr style={{ backgroundColor: '#fbfbfb', borderBottom: '2px solid #ddd' }}>
                                                    <td colSpan={6} style={{ padding: '10px 20px 20px 40px' }}>
                                                        <table className="data-table dense" style={{ border: '1px solid #eee', backgroundColor: 'white', fontSize: '13px' }}>
                                                            <thead>
                                                                <tr style={{ backgroundColor: '#ecf0f1' }}>
                                                                    <th style={{ width: '15%' }}>İşlem Türü</th>
                                                                    <th style={{ width: '20%' }}>İlgili Kişi / Fiş</th>
                                                                    <th style={{ width: '15%' }}>Ödeme Yöntemi</th>
                                                                    <th>Açıklama</th>
                                                                    <th style={{ width: '15%', textAlign: 'right' }}>Tutar</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {p.items.map((item, idx) => (
                                                                    <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                                                        <td>
                                                                            <span className={`badge ${
                                                                                item.type === 'Tahsilat' ? 'badge-success' : 
                                                                                item.type === 'Merkez' ? 'badge-danger' : 
                                                                                item.type === 'Masraf' ? 'badge-warning' : 'badge-secondary'
                                                                            }`}>
                                                                                {item.type}
                                                                            </span>
                                                                        </td>
                                                                        <td>
                                                                            {item.customerName ? (
                                                                                <div>
                                                                                    <strong>{item.customerName}</strong>
                                                                                    <div style={{fontSize:'11px', color:'#777'}}>Fiş: {item.saleReceiptNo}</div>
                                                                                </div>
                                                                            ) : "-"}
                                                                        </td>
                                                                        <td>{item.paymentMethodId}</td>
                                                                        <td>{item.description}</td>
                                                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: item.type === 'Tahsilat' ? '#27ae60' : '#c0392b' }}>
                                                                            {item.type === 'Tahsilat' ? '+' : '-'}{Number(item.amount).toFixed(2)} ₺
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))
                                ) : (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Kayıt bulunamadı.</td></tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#95a5a6' }}><div style={{ fontSize: '40px', marginBottom: '10px' }}>🏬</div><p>Lütfen mağaza seçiniz.</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentList;