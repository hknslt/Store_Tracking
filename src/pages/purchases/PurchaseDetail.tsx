// src/pages/purchases/PurchaseDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getCategories, getColors, getDimensions, getCushions } from "../../services/definitionService";
import type { Purchase, Category, Color, Dimension, Cushion } from "../../types";
import "../../App.css";

// LOGO
import logo from "../../assets/logo/Bahçemo_green.png";

const PurchaseDetail = () => {
    const { storeId, id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [purchase, setPurchase] = useState<Purchase | null>(location.state?.purchase || null);
    const [loading, setLoading] = useState(!location.state?.purchase);

    // Tanımlar
    const [categories, setCategories] = useState<Category[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);

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
                        alert("Alış kaydı bulunamadı!");
                        navigate("/purchases");
                    }
                }
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        initData();
    }, [storeId, id, purchase, navigate]);

    const getName = (list: any[], id: string | undefined, key: string) => list.find(x => x.id === id)?.[key] || "-";
    const formatDate = (date: string) => new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>Yükleniyor...</div>;
    if (!purchase) return <div className="page-container">Kayıt bulunamadı.</div>;

    return (
        <div className="page-container">

            {/* ÜST BUTONLAR */}
            <div className="no-print" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => navigate(-1)} className="btn btn-secondary">← Listeye Dön</button>
                <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    Yazdır /PDF
                </button>
            </div>

            {/* FİŞ GÖRÜNÜMÜ */}
            <div id="printable-area" className="invoice-box" style={{
                backgroundColor: 'white',
                padding: '50px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                boxShadow: '0 5px 30px rgba(0,0,0,0.05)',
                maxWidth: '900px',
                margin: '0 auto'
            }}>

                {/* 1. BAŞLIK & LOGO */}
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

                {/* 2. TEDARİKÇİ / PERSONEL BİLGİLERİ */}
                <div style={{ marginBottom: '40px' }}>
                    <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#95a5a6', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px' }}>İşlem Detayları</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px', color: '#333' }}>
                        <div style={{ textAlign: 'right' }}>
                            <strong>İşlemi Yapan:</strong> {purchase.personnelName}
                        </div>
                    </div>
                </div>

                {/* 3. ÜRÜN TABLOSU */}
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

                                {/* 1. SÜTUN: Ürün Bilgisi (Yanyana Format) */}
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
                                            {getName(categories, item.categoryId, 'categoryName')}
                                        </span>
                                    </div>

                                    {item.explanation && (
                                        <div style={{ fontSize: '11px', color: '#e74c3c', marginTop: '4px', fontStyle: 'italic' }}>
                                            *{item.explanation}
                                        </div>
                                    )}
                                </td>

                                {/* 2. SÜTUN: Renk */}
                                <td style={{ padding: '15px 12px', textAlign: 'center', fontSize: '14px', color: '#555' }}>
                                    {getName(colors, item.colorId, 'colorName')}
                                </td>

                                {/* 3. SÜTUN: Minder */}
                                <td style={{ padding: '15px 12px', textAlign: 'center', fontSize: '14px', color: '#555' }}>
                                    {item.cushionId ? getName(cushions, item.cushionId, 'cushionName') : '-'}
                                </td>

                                {/* 4. SÜTUN: Adet */}
                                <td style={{ padding: '15px 12px', textAlign: 'center', fontWeight: 'bold' }}>
                                    {item.quantity}
                                </td>

                                {/* 5. SÜTUN: Birim Fiyat (Tutar / Adet) */}
                                <td style={{ padding: '15px 12px', textAlign: 'right' }}>
                                    {Number(item.amount / item.quantity).toFixed(2)} ₺
                                </td>

                                {/* 6. SÜTUN: Toplam Tutar */}
                                <td style={{ padding: '15px 12px', textAlign: 'right', fontWeight: '600' }}>
                                    {Number(item.amount).toFixed(2)} ₺
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* 4. TOPLAM */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '250px', borderTop: '2px solid #333', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                        <span>GENEL TOPLAM:</span>
                        <span>{Number(purchase.totalAmount).toFixed(2)} ₺</span>
                    </div>
                </div>

                {/* 5. DİPNOT */}
                <div style={{ marginTop: '60px', borderTop: '1px solid #eee', paddingTop: '20px', textAlign: 'center', color: '#95a5a6', fontSize: '12px' }}>
                    <p><strong>Bahçemo Home Garden</strong> -www.bahcemo.com.tr</p>
                </div>

            </div>
        </div>
    );
};

export default PurchaseDetail; 