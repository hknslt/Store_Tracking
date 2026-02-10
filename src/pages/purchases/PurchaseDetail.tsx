// src/pages/purchases/PurchaseDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
// 🔥 EKLENDİ: resetPurchaseToPending import edildi
import { cancelPurchaseComplete, deletePurchaseComplete, resetPurchaseToPending } from "../../services/purchaseService";
import { getCategories, getColors, getDimensions, getCushions } from "../../services/definitionService";
import { useAuth } from "../../context/AuthContext";
import type { Purchase, Category, Color, Dimension, Cushion } from "../../types";
import "../../App.css";

import logo from "../../assets/logo/Bahçemo_green.png";

const PurchaseDetail = () => {
    const { storeId, id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { userRole } = useAuth();
    const isAdmin = userRole === 'admin';

    const [purchase, setPurchase] = useState<Purchase | null>(location.state?.purchase || null);
    const [loading, setLoading] = useState(!location.state?.purchase);

    // Mesaj State'i
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Tanımlar
    const [categories, setCategories] = useState<Category[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);

    const [modal, setModal] = useState<{ show: boolean, action: 'cancel' | 'delete' | 'reset' } | null>(null);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        const initData = async () => {
            try {
                const [c, col, dim, cush] = await Promise.all([
                    getCategories(), getColors(), getDimensions(), getCushions()
                ]);
                setCategories(c); setColors(col); setDimensions(dim); setCushions(cush);

                if (!purchase && storeId && id) {
                    const docRef = doc(db, "purchases", storeId, "receipts", id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setPurchase({ id: docSnap.id, ...docSnap.data() } as Purchase);
                    } else {
                        navigate("/purchases");
                    }
                }
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        initData();
    }, [storeId, id, purchase, navigate]);

    const getName = (list: any[], id: string | undefined, key: string) => list.find(x => x.id === id)?.[key] || "-";
    const formatDate = (date: string) => new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    const handlePrint = () => { window.print(); };

    const confirmAction = async () => {
        if (!storeId || !id || !modal) return;
        setLoading(true);
        try {
            if (modal.action === 'cancel') {
                await cancelPurchaseComplete(storeId, id);
                setMessage({ type: 'success', text: "Sipariş başarıyla iptal edildi." });
            } else if (modal.action === 'delete') {
                await deletePurchaseComplete(storeId, id);
                setMessage({ type: 'success', text: "Kayıt başarıyla silindi." });
                setTimeout(() => navigate("/purchases"), 1500);
                return;
            } else if (modal.action === 'reset') {
                // 🔥 SIFIRLAMA İŞLEMİ
                await resetPurchaseToPending(storeId, id);
                setMessage({ type: 'success', text: "Fiş 'Beklemede' durumuna geri alındı." });
            }

            // Veriyi yenile
            const docRef = doc(db, "purchases", storeId, "receipts", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setPurchase({ id: docSnap.id, ...docSnap.data() } as Purchase);
            }

        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || "İşlem başarısız oldu." });
        } finally {
            setLoading(false);
            setModal(null);
        }
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>Yükleniyor...</div>;
    if (!purchase) return <div className="page-container">Kayıt bulunamadı.</div>;

    const isCancelled = purchase.items.every(i => i.status === 'İptal');
    const isCompleted = purchase.items.every(i => i.status === 'Tamamlandı');
    // Eğer en az bir ürün "Beklemede" veya "İptal" DEĞİLSE, süreç başlamış demektir.
    const isProcessStarted = purchase.items.some(i => i.status !== 'Beklemede' && i.status !== 'İptal');

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

            {modal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '350px', textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 10px 0' }}>Emin misiniz?</h3>
                        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                            {modal.action === 'cancel'
                                ? "Alış iptal edilecek, stoklar geri düşülecek."
                                : modal.action === 'delete'
                                    ? "Kayıt tamamen silinecek ve stoklar geri alınacak."
                                    : "Tüm ürünlerin durumu 'Beklemede' olarak değiştirilecek. Düzenleme yapabilirsiniz."}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                            <button onClick={() => setModal(null)} className="btn btn-secondary">Vazgeç</button>
                            <button onClick={confirmAction} className="btn btn-danger">Onayla</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ÜST BUTONLAR */}
            <div className="no-print" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => navigate(-1)} className="btn btn-secondary">← Listeye Dön</button>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {isAdmin && (
                        <>
                            {/* 🔥 SIFIRLAMA BUTONU: Süreç başlamışsa (Onaylandı/Üretim vs) ve tamamlanmamışsa görünür */}
                            {!isCancelled && !isCompleted && isProcessStarted && (
                                <button
                                    onClick={() => setModal({ show: true, action: 'reset' })}
                                    className="btn"
                                    style={{ backgroundColor: '#64748b', color: 'white' }}
                                >
                                    ↺ Beklemeye Al
                                </button>
                            )}

                            {!isCancelled && !isCompleted && (
                                <button onClick={() => setModal({ show: true, action: 'cancel' })} className="btn btn-warning" style={{ backgroundColor: '#f39c12' }}>
                                    İptal Et
                                </button>
                            )}
                            <button onClick={() => setModal({ show: true, action: 'delete' })} className="btn btn-danger">
                                Sil
                            </button>
                        </>
                    )}
                    <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        Yazdır /PDF
                    </button>
                </div>
            </div>

            {/* FİŞ GÖRÜNÜMÜ */}
            <div id="printable-area" className="invoice-box" style={{
                backgroundColor: 'white',
                padding: '50px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                boxShadow: '0 5px 30px rgba(0,0,0,0.05)',
                maxWidth: '900px',
                margin: '0 auto',
                position: 'relative'
            }}>

                {isCancelled && (
                    <div style={{
                        position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)',
                        fontSize: '100px', color: 'rgba(231, 76, 60, 0.2)', fontWeight: 'bold', border: '10px solid rgba(231, 76, 60, 0.2)',
                        padding: '20px', borderRadius: '20px', pointerEvents: 'none', zIndex: 0
                    }}>
                        İPTAL
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f0f0f0', paddingBottom: '30px', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <img src={logo} alt="Logo" style={{ height: '70px', objectFit: 'contain' }} />
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#2c3e50', letterSpacing: '-0.5px' }}>
                                {purchase.type === 'Sipariş' ? 'SİPARİŞ TALEP FORMU' : 'STOK GİRİŞ FİŞİ'}
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', color: '#95a5a6' }}>Fiş Numarası</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>{purchase.receiptNo}</div>
                        <div style={{ marginTop: '5px', fontSize: '14px', color: '#333' }}>{formatDate(purchase.date)}</div>
                    </div>
                </div>

                <div style={{ marginBottom: '40px' }}>
                    <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#95a5a6', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px' }}>İşlem Detayları</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px', color: '#333' }}>
                        <div style={{ textAlign: 'right' }}>
                            <strong>İşlemi Yapan:</strong> {purchase.personnelName}
                        </div>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#145a32', color: 'white' }}>
                            <th style={{ padding: '12px', textAlign: 'left', borderTopLeftRadius: '6px', width: '35%' }}>Ürün</th>
                            <th style={{ padding: '12px', textAlign: 'center', width: '12%' }}>Renk</th>
                            <th style={{ padding: '12px', textAlign: 'center', width: '12%' }}>Minder</th>
                            <th style={{ padding: '12px', textAlign: 'center', width: '8%' }}>Adet</th>
                            <th style={{ padding: '12px', textAlign: 'right', width: '13%' }}>Birim Fiyat</th>
                            <th style={{ padding: '12px', textAlign: 'right', width: '15%', borderTopRightRadius: '6px' }}>Tutar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchase.items.map((item, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '15px 12px' }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold', color: '#333', marginRight: '6px' }}>
                                            {item.productName.split('-')[0].trim()}
                                        </span>
                                        {item.dimensionId && (
                                            <span style={{ color: '#e67e22', fontWeight: '600', marginRight: '6px' }}>
                                                {getName(dimensions, item.dimensionId, 'dimensionName')}
                                            </span>
                                        )}
                                        <span style={{ fontSize: '13px', color: '#7f8c8d', fontWeight: '500' }}>
                                            ({getName(categories, item.categoryId, 'categoryName')})
                                        </span>
                                    </div>
                                    {item.explanation && (
                                        <div style={{ fontSize: '11px', color: '#e74c3c', marginTop: '4px', fontStyle: 'italic' }}>
                                            *{item.explanation}
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '15px 12px', textAlign: 'center', fontSize: '14px', color: '#555' }}>{getName(colors, item.colorId, 'colorName')}</td>
                                <td style={{ padding: '15px 12px', textAlign: 'center', fontSize: '14px', color: '#555' }}>{item.cushionId ? getName(cushions, item.cushionId, 'cushionName') : '-'}</td>
                                <td style={{ padding: '15px 12px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>{item.quantity}</td>
                                <td style={{ padding: '15px 12px', textAlign: 'right', fontSize: '14px' }}>{Number(item.amount / item.quantity).toFixed(2)} ₺</td>
                                <td style={{ padding: '15px 12px', textAlign: 'right', fontWeight: '600', fontSize: '15px', color: '#2c3e50' }}>{Number(item.amount).toFixed(2)} ₺</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PurchaseDetail;