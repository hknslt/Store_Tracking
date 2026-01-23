// src/pages/sales/SaleDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getCategories, getColors, getDimensions, getCushions } from "../../services/definitionService";
import { cancelSaleComplete, deleteSaleComplete } from "../../services/saleService";
import { useAuth } from "../../context/AuthContext";
import type { Sale, Category, Color, Dimension, Cushion } from "../../types";
import "../../App.css";

// LOGO
import logo from "../../assets/logo/Bahçemo_green.png";

const SaleDetail = () => {
    const { storeId, id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { userRole } = useAuth();

    // Veri State'leri
    const [sale, setSale] = useState<Sale | null>(location.state?.sale || null);
    const [loading, setLoading] = useState(!location.state?.sale);

    // Tanımlar
    const [categories, setCategories] = useState<Category[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);

    // Onay Modalı State
    const [modal, setModal] = useState<{ show: boolean, action: 'cancel' | 'delete' } | null>(null);

    useEffect(() => {
        const initData = async () => {
            try {
                const [c, col, dim, cush] = await Promise.all([
                    getCategories(), getColors(), getDimensions(), getCushions()
                ]);
                setCategories(c); setColors(col); setDimensions(dim); setCushions(cush);

                if (!sale && storeId && id) {
                    const docRef = doc(db, "sales", storeId, "receipts", id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setSale({ id: docSnap.id, ...docSnap.data() } as Sale);
                    } else {
                        navigate("/sales");
                    }
                }
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        initData();
    }, [storeId, id, sale, navigate]);

    const getName = (list: any[], id: string | undefined, key: string) => list.find(x => x.id === id)?.[key] || "-";
    const formatDate = (date: string) => new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    // --- İŞLEMLER ---

    const handlePrint = () => {
        window.print();
    };

    const confirmAction = async () => {
        if (!storeId || !id || !modal) return;
        setLoading(true);
        try {
            if (modal.action === 'cancel') {
                await cancelSaleComplete(storeId, id);
            } else {
                await deleteSaleComplete(storeId, id);
            }
            navigate("/sales");
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setModal(null);
        }
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>Yükleniyor...</div>;
    if (!sale) return <div className="page-container">Kayıt bulunamadı.</div>;

    // --- HESAPLAMALAR ---
    const subTotal = sale.items.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
    const totalDiscount = sale.items.reduce((acc, item) => acc + ((Number(item.discount) || 0) * Number(item.quantity)), 0);
    const isCancelled = (sale as any).status === 'İptal' || sale.items.every(i => i.deliveryStatus === 'İptal');
    const isAllDelivered = sale.items.every(i => i.deliveryStatus === 'Teslim Edildi');

    return (
        <div className="page-container">

            {/* ONAY MODALI */}
            {modal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '350px', textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 10px 0' }}>Emin misiniz?</h3>
                        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                            {modal.action === 'cancel'
                                ? "Sipariş iptal edilecek, stoklar geri yüklenecek."
                                : "Sipariş kalıcı olarak silinecek."}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                            <button onClick={() => setModal(null)} className="btn btn-secondary">Vazgeç</button>
                            <button onClick={confirmAction} className="btn btn-danger">Onayla</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ÜST BUTONLAR (Yazdırmada Gizlenir) */}
            <div className="no-print" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => navigate(-1)} className="btn btn-secondary">← Listeye Dön</button>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {userRole === 'admin' && (
                        <>
                            {!isCancelled && !isAllDelivered && (
                                <button onClick={() => setModal({ show: true, action: 'cancel' })} className="btn btn-warning" style={{ backgroundColor: '#f39c12' }}>
                                    İptal Et
                                </button>
                            )}
                            <button onClick={() => setModal({ show: true, action: 'delete' })} className="btn btn-danger">
                                Sil
                            </button>
                        </>
                    )}
                    <button onClick={handlePrint} className="btn btn-primary">Yazdır / PDF</button>
                </div>
            </div>

            {/* FİŞ GÖRÜNÜMÜ (A4 Kağıdı Gibi) */}
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

                {/* İPTAL DAMGASI */}
                {isCancelled && (
                    <div style={{
                        position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)',
                        fontSize: '100px', color: 'rgba(231, 76, 60, 0.2)', fontWeight: 'bold', border: '10px solid rgba(231, 76, 60, 0.2)',
                        padding: '20px', borderRadius: '20px', pointerEvents: 'none', zIndex: 0
                    }}>
                        İPTAL
                    </div>
                )}

                {/* 1. BAŞLIK & LOGO */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f0f0f0', paddingBottom: '30px', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <img src={logo} alt="Logo" style={{ height: '70px', objectFit: 'contain' }} />
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#2c3e50', letterSpacing: '-0.5px' }}>SATIŞ BELGESİ</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', color: '#95a5a6' }}>Fiş Numarası</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>{sale.receiptNo}</div>
                        <div style={{ marginTop: '5px', fontSize: '14px', color: '#333' }}>{formatDate(sale.date)}</div>
                    </div>
                </div>

                {/* 2. MÜŞTERİ VE TESLİMAT BİLGİLERİ (GÜNCELLENDİ) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', gap: '40px' }}>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#95a5a6', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px' }}>Müşteri Bilgileri</h4>

                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '5px' }}>{sale.customerName}</div>

                        {/* TC ve Mail Eklendi */}
                        {sale.tc && <div style={{ fontSize: '13px', color: '#555' }}>TC: {sale.tc}</div>}
                        {sale.email && <div style={{ fontSize: '13px', color: '#555' }}>E-Posta: {sale.email}</div>}

                        <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: '600' }}>{sale.phone}</div>

                        <div style={{ marginTop: '10px', fontSize: '13px', color: '#555', lineHeight: '1.6', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '6px' }}>
                            <strong>Teslimat Adresi:</strong><br />
                            {sale.address ? sale.address : 'Adres belirtilmedi'}<br />
                            {sale.city && sale.district ? `${sale.district} / ${sale.city}` : ''}
                        </div>
                    </div>

                    <div style={{ flex: 1, textAlign: 'right' }}>
                        <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#95a5a6', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px' }}>Sipariş Detayları</h4>
                        <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.8' }}>
                            <div><strong>Satış Temsilcisi:</strong> {sale.personnelName}</div>
                            <div><strong>Termin Tarihi:</strong> <span style={{ color: '#e67e22', fontWeight: 'bold' }}>{formatDate(sale.deadline)}</span></div>

                            {/* Sipariş Notu Eklendi */}
                            {sale.explanation && (
                                <div style={{ marginTop: '15px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', padding: '10px', borderRadius: '6px', textAlign: 'left', fontSize: '13px', color: '#92400e' }}>
                                    <strong>📝 Sipariş Notu:</strong><br />
                                    {sale.explanation}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. ÜRÜN TABLOSU */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#145a32', color: 'white' }}>
                            <th style={{ padding: '12px', textAlign: 'left', borderTopLeftRadius: '6px', width: '30%' }}>Ürün Bilgisi</th>
                            <th style={{ padding: '12px', textAlign: 'center', width: '12%' }}>Renk</th>
                            <th style={{ padding: '12px', textAlign: 'center', width: '12%' }}>Minder</th>
                            <th style={{ padding: '12px', textAlign: 'center', width: '8%' }}>Adet</th>
                            <th style={{ padding: '12px', textAlign: 'right', width: '13%' }}>Birim Fiyat</th>
                            <th style={{ padding: '12px', textAlign: 'right', width: '15%', borderTopRightRadius: '6px' }}>Toplam</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.items.map((item, index) => (
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
                                    {item.productNote && (
                                        <div style={{ fontSize: '11px', color: '#e74c3c', marginTop: '4px', fontStyle: 'italic' }}>
                                            *{item.productNote}
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '15px 12px', textAlign: 'center', fontSize: '14px', color: '#555' }}>
                                    {getName(colors, item.colorId, 'colorName')}
                                </td>
                                <td style={{ padding: '15px 12px', textAlign: 'center', fontSize: '14px', color: '#555' }}>
                                    {item.cushionId ? getName(cushions, item.cushionId, 'cushionName') : '-'}
                                </td>
                                <td style={{ padding: '15px 12px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                                    {item.quantity}
                                </td>
                                <td style={{ padding: '15px 12px', textAlign: 'right', fontSize: '14px' }}>
                                    {Number(item.price).toFixed(2)} ₺
                                    {Number(item.discount) > 0 && (
                                        <div style={{ fontSize: '10px', color: 'red' }}>-{Number(item.discount)} ind.</div>
                                    )}
                                </td>
                                <td style={{ padding: '15px 12px', textAlign: 'right', fontWeight: '600', fontSize: '15px', color: '#2c3e50' }}>
                                    {((Number(item.price) - (Number(item.discount) || 0)) * Number(item.quantity)).toFixed(2)} ₺
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* 4. TOPLAMLAR */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '250px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#555' }}>
                            <span>Ara Toplam:</span>
                            <span>{subTotal.toFixed(2)} ₺</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#e74c3c' }}>
                                <span>Toplam İskonto:</span>
                                <span>-{totalDiscount.toFixed(2)} ₺</span>
                            </div>
                        )}
                        {sale.shippingCost > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#555' }}>
                                <span>Nakliye / Hizmet:</span>
                                <span>{Number(sale.shippingCost).toFixed(2)} ₺</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #000000', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                            <span>GENEL TOPLAM:</span>
                            <span>{Number(sale.grandTotal).toFixed(2)} ₺</span>
                        </div>
                    </div>
                </div>

                {/* 5. FOOTER */}
                <div style={{ marginTop: '60px', borderTop: '1px solid #eee', paddingTop: '20px', textAlign: 'center', color: '#95a5a6', fontSize: '12px' }}>
                    <p><strong>Bahçemo Home Garden</strong> - www.bahcemo.com.tr</p>
                </div>

            </div>
        </div>
    );
};

export default SaleDetail;