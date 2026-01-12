// src/pages/sales/SaleDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getCategories, getColors, getDimensions, getCushions, getGroups } from "../../services/definitionService";
import type { Sale, Category, Color, Dimension, Cushion, Group } from "../../types";
import "../../App.css";

const SaleDetail = () => {
    const { storeId, id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Veri State'leri
    const [sale, setSale] = useState<Sale | null>(location.state?.sale || null);
    const [loading, setLoading] = useState(!location.state?.sale);

    // Tanımlar
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);

    useEffect(() => {
        const initData = async () => {
            try {
                // 1. Tanımları Çek
                const [g, c, col, dim, cush] = await Promise.all([
                    getGroups(), getCategories(), getColors(), getDimensions(), getCushions()
                ]);
                setGroups(g); setCategories(c); setColors(col); setDimensions(dim); setCushions(cush);

                // 2. Eğer elimizde satış verisi yoksa Firebase'den çek
                if (!sale && storeId && id) {
                    const docRef = doc(db, "sales", storeId, "receipts", id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setSale({ id: docSnap.id, ...docSnap.data() } as Sale);
                    } else {
                        alert("Satış kaydı bulunamadı!");
                        navigate("/sales");
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, [storeId, id, sale, navigate]);

    const getName = (list: any[], id: string | undefined, key: string) => list.find(x => x.id === id)?.[key] || "-";
    const formatDate = (date: string) => new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;
    if (!sale) return <div className="page-container">Kayıt bulunamadı.</div>;

    // --- HESAPLAMALAR ---
    const subTotal = sale.items.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
    const totalDiscount = sale.items.reduce((acc, item) => acc + ((Number(item.discount) || 0) * Number(item.quantity)), 0);

    return (
        <div className="page-container">

            {/* ÜST BUTONLAR */}
            <div className="no-print" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => navigate(-1)} className="btn btn-secondary">← Geri Dön</button>
                <button onClick={handlePrint} className="btn btn-primary">🖨️ Yazdır</button>
            </div>

            {/* FİŞ GÖRÜNÜMÜ */}
            <div className="invoice-box" style={{
                backgroundColor: 'white',
                padding: '40px',
                border: '1px solid #ddd',
                boxShadow: '0 0 20px rgba(0,0,0,0.05)',
                maxWidth: '900px',
                margin: '0 auto'
            }}>

                {/* 1. BAŞLIK */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
                    <div>
                        <h1 style={{ margin: 0, color: '#2c3e50' }}>SATIŞ FİŞİ</h1>
                        <div style={{ color: '#7f8c8d', marginTop: '5px' }}>Flexy Mobilya Sistemleri</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>FİŞ NO: {sale.receiptNo}</div>
                        <div style={{ color: '#555' }}>{formatDate(sale.date)}</div>
                    </div>
                </div>

                {/* 2. BİLGİLER */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '30px' }}>
                    <div>
                        <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px', color: '#e67e22' }}>Müşteri Bilgileri</h4>
                        <div style={{ lineHeight: '1.6', fontSize: '14px' }}>
                            <strong>{sale.customerName}</strong><br />
                            Telefon: {sale.phone}<br />
                            İl/İlçe: {sale.city} / {sale.district}
                        </div>
                    </div>
                    <div>
                        <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px', color: '#3498db' }}>Teslimat & Notlar</h4>
                        <div style={{ lineHeight: '1.6', fontSize: '14px' }}>
                            <strong>Adres:</strong> {sale.address || "Adres girilmedi"}<br />
                            <strong>Termin Notu:</strong> {sale.customerNote || "-"}<br />
                            <strong>Personel:</strong> {sale.personnelName}
                        </div>
                    </div>
                </div>

                {/* 3. ÜRÜN TABLOSU */}
                <table className="data-table" style={{ width: '100%', marginBottom: '20px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                            <th style={{ textAlign: 'left', padding: '12px', width: '35%' }}>Ürün Bilgisi</th>
                            <th style={{ textAlign: 'center', padding: '12px', width: '15%' }}>Renk</th>
                            <th style={{ textAlign: 'center', padding: '12px', width: '15%' }}>Minder</th>
                            <th style={{ textAlign: 'center', padding: '12px', width: '10%' }}>Adet</th>
                            <th style={{ textAlign: 'right', padding: '12px', width: '12%' }}>Birim Fiyat</th>
                            <th style={{ textAlign: 'right', padding: '12px', width: '13%' }}>Toplam</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.items.map((item, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                {/* ÜRÜN BİLGİSİ: Ad + Ebat + Kategori */}
                                <td style={{ padding: '12px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#2c3e50', marginRight: '6px' }}>
                                        {item.productName.split('-')[0]}
                                    </span>

                                    {item.dimensionId && (
                                        <span style={{ color: '#e67e22', fontWeight: '600', marginRight: '6px' }}>
                                            {getName(dimensions, item.dimensionId, 'dimensionName')}
                                        </span>
                                    )}

                                    <span style={{ fontSize: '12px', color: '#7f8c8d' }}>
                                        ({getName(categories, item.categoryId, 'categoryName')})
                                    </span>

                                    {item.productNote && <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#e74c3c', marginTop: '4px' }}>Not: {item.productNote}</div>}
                                </td>

                                {/* RENK */}
                                <td style={{ textAlign: 'center', padding: '12px', fontSize: '13px' }}>
                                    {getName(colors, item.colorId, 'colorName')}
                                </td>

                                {/* MİNDER */}
                                <td style={{ textAlign: 'center', padding: '12px', fontSize: '13px', color: '#555' }}>
                                    {item.cushionId ? getName(cushions, item.cushionId, 'cushionName') : '-'}
                                </td>

                                {/* ADET */}
                                <td style={{ textAlign: 'center', padding: '12px', fontWeight: 'bold' }}>
                                    {item.quantity}
                                </td>

                                {/* BİRİM FİYAT */}
                                <td style={{ textAlign: 'right', padding: '12px' }}>
                                    {Number(item.price).toFixed(2)} ₺
                                    {Number(item.discount) > 0 && <div style={{ fontSize: '11px', color: 'red' }}>-{Number(item.discount)} ₺</div>}
                                </td>

                                {/* TOPLAM */}
                                <td style={{ textAlign: 'right', padding: '12px', fontWeight: 'bold' }}>
                                    {((Number(item.price) - (Number(item.discount) || 0)) * Number(item.quantity)).toFixed(2)} ₺
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* 4. ALT TOPLAMLAR */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '300px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee' }}>
                            <span>Ara Toplam:</span>
                            <span>{subTotal.toFixed(2)} ₺</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee', color: 'red' }}>
                                <span>İskonto:</span>
                                <span>-{totalDiscount.toFixed(2)} ₺</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee' }}>
                            <span>Nakliye:</span>
                            <span>{Number(sale.shippingCost).toFixed(2)} ₺</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', fontSize: '18px', fontWeight: 'bold', color: '#27ae60' }}>
                            <span>GENEL TOPLAM:</span>
                            <span>{Number(sale.grandTotal).toFixed(2)} ₺</span>
                        </div>
                    </div>
                </div>

                {/* 5. DİPNOT */}
                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'center', fontSize: '12px', color: '#999' }}>
                    <p>Bu belge bilgilendirme amaçlıdır. Mali değeri yoktur.</p>
                    <p>Flexy Mobilya Sistemleri - {new Date().getFullYear()}</p>
                </div>

            </div>
        </div>
    );
};

export default SaleDetail;