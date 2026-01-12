// src/pages/sales/SaleDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getCategories, getColors, getDimensions, getCushions, getGroups } from "../../services/definitionService";
import type { Sale, Category, Color, Dimension, Cushion, Group } from "../../types";
import "../../App.css";

// 👇 LOGO IMPORT (Dosya yolunun doğru olduğundan emin olun)
// Eğer logo src/assets/logo.png yolundaysa:
import logo from "../../assets/logo/Bahçemo_green.png";

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

    if (loading) return <div className="page-container" > Yükleniyor...</div>;
    if (!sale) return <div className="page-container" > Kayıt bulunamadı.</div>;

    // --- HESAPLAMALAR ---
    const subTotal = sale.items.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
    const totalDiscount = sale.items.reduce((acc, item) => acc + ((Number(item.discount) || 0) * Number(item.quantity)), 0);

    return (
        <div className="page-container" >

            {/* ÜST BUTONLAR */}
            < div className="no-print" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }
            }>
                <button onClick={() => navigate(-1)} className="btn btn-secondary" >← Geri Dön </button>
                < button onClick={handlePrint} className="btn btn-primary" >🖨️ Yazdır </button>
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

                {/* 1. BAŞLIK ALANI (LOGO EKLENDİ) */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '2px solid #eee',
                    paddingBottom: '20px',
                    marginBottom: '20px'
                }}>

                    {/* 1. SOL ALAN (LOGO) - flex: 1 ve sola yaslı */}
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                        <img
                            src={logo}
                            alt="Flexy Logo"
                            style={{
                                width: '100px',      // Genişliği buradan ayarlayabilirsiniz
                                height: 'auto',      // Yükseklik orantılı değişir
                                objectFit: 'contain',
                                maxHeight: '100px'    // Maksimum yükseklik sınırı (isteğe bağlı)
                            }}
                        />
                    </div>

                    {/* 2. ORTA ALAN (BAŞLIK) - flex: 1 ve ortaya yaslı */}
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <h1 style={{ margin: 0, color: '#2c3e50', fontSize: '24px', letterSpacing: '1px' }}>
                            SATIŞ FİŞİ
                        </h1>
                        {/* İsterseniz alt firma ismini de burada gösterebilirsiniz */}
                        {/* <div style={{ color: '#7f8c8d', fontSize: '12px' }}>Flexy Mobilya Sistemleri</div> */}
                    </div>

                    {/* 3. SAĞ ALAN (BİLGİLER) - flex: 1 ve sağa yaslı */}
                    <div style={{ flex: 1, textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>
                            FİŞ NO: {sale.receiptNo}
                        </div>
                        <div style={{ color: '#555', marginTop: '5px' }}>
                            {formatDate(sale.date)}
                        </div>
                    </div>

                </div>

                {/* 2. BİLGİLER */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '30px' }}>
                    <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#e67e22' }}> Müşteri Bilgileri </h4>
                        <div style={{ lineHeight: '1.6', fontSize: '14px', color: '#333' }}>
                            <strong style={{ fontSize: '16px' }}>{sale.customerName}</strong><br />
                            📞 {sale.phone}<br />
                            📍 {sale.city} / {sale.district}
                        </div>
                    </div>
                    < div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#3498db' }}> Teslimat & Notlar </h4>
                        < div style={{ lineHeight: '1.6', fontSize: '14px', color: '#333' }}>
                            <strong>Adres: </strong> {sale.address || "Adres girilmedi"}<br />
                            <strong>Not: </strong> <span style={{ fontStyle: 'italic' }}>{sale.customerNote || "-"}</span > <br />
                            < strong > Personel: </strong> {sale.personnelName}
                        </div>
                    </div>
                </div>

                {/* 3. ÜRÜN TABLOSU */}
                <table className="data-table" style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                            <th style={{ textAlign: 'left', padding: '12px', width: '35%' }}> Ürün Bilgisi </th>
                            < th style={{ textAlign: 'center', padding: '12px', width: '15%' }}> Renk </th>
                            < th style={{ textAlign: 'center', padding: '12px', width: '15%' }}> Minder </th>
                            < th style={{ textAlign: 'center', padding: '12px', width: '10%' }}> Adet </th>
                            < th style={{ textAlign: 'right', padding: '12px', width: '12%' }}> Birim Fiyat </th>
                            < th style={{ textAlign: 'right', padding: '12px', width: '13%' }}> Toplam </th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            sale.items.map((item, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{ fontWeight: 'bold', color: '#2c3e50', marginRight: '6px' }}>
                                            {item.productName.split('-')[0]}
                                        </span>

                                        {
                                            item.dimensionId && (
                                                <span style={{ color: '#e67e22', fontWeight: '600', marginRight: '6px', fontSize: '13px' }}>
                                                    {getName(dimensions, item.dimensionId, 'dimensionName')}
                                                </span>
                                            )
                                        }

                                        <span style={{ fontSize: '12px', color: '#7f8c8d' }}>
                                            ({getName(categories, item.categoryId, 'categoryName')})
                                        </span>

                                        {item.productNote && <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#e74c3c', marginTop: '4px' }}> Not: {item.productNote} </div>}
                                    </td>

                                    < td style={{ textAlign: 'center', padding: '12px', fontSize: '13px' }}>
                                        {getName(colors, item.colorId, 'colorName')}
                                    </td>

                                    < td style={{ textAlign: 'center', padding: '12px', fontSize: '13px', color: '#555' }}>
                                        {item.cushionId ? getName(cushions, item.cushionId, 'cushionName') : '-'}
                                    </td>

                                    < td style={{ textAlign: 'center', padding: '12px', fontWeight: 'bold' }}>
                                        {item.quantity}
                                    </td>

                                    < td style={{ textAlign: 'right', padding: '12px' }}>
                                        {Number(item.price).toFixed(2)} ₺
                                        {Number(item.discount) > 0 && <div style={{ fontSize: '11px', color: 'red' }}> -{Number(item.discount)} ₺</div>}
                                    </td>

                                    < td style={{ textAlign: 'right', padding: '12px', fontWeight: 'bold' }}>
                                        {((Number(item.price) - (Number(item.discount) || 0)) * Number(item.quantity)).toFixed(2)} ₺
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>

                {/* 4. ALT TOPLAMLAR */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '300px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', color: '#555' }}>
                            <span>Ara Toplam: </span>
                            < span > {subTotal.toFixed(2)} ₺</span>
                        </div>
                        {
                            totalDiscount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', color: 'red' }}>
                                    <span>İskonto: </span>
                                    < span > -{totalDiscount.toFixed(2)} ₺</span>
                                </div>
                            )
                        }
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', color: '#555' }}>
                            <span>Nakliye: </span>
                            < span > {Number(sale.shippingCost).toFixed(2)} ₺</span>
                        </div>
                        < div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', fontSize: '20px', fontWeight: 'bold', color: '#27ae60', borderTop: '2px solid #eee', marginTop: '5px' }}>
                            <span>GENEL TOPLAM: </span>
                            < span > {Number(sale.grandTotal).toFixed(2)} ₺</span>
                        </div>
                    </div>
                </div>

                {/* 5. DİPNOT */}
                <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'center', fontSize: '12px', color: '#999' }}>
                    <p style={{ margin: 0 }}> Flexy Bahçe Mobilyaları </p>
                    <p style={{ margin: 0 }}> www.flexygarden.com </p>
                </div>

            </div>
        </div>
    );
};

export default SaleDetail;