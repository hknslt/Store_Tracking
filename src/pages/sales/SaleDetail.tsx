// src/pages/sales/SaleDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getCategories, getColors, getDimensions, getCushions, getGroups } from "../../services/definitionService";
import { cancelSaleComplete, deleteSaleComplete } from "../../services/saleService";
import { useAuth } from "../../context/AuthContext"; // userRole için
import type { Sale, Category, Color, Dimension, Cushion, Group } from "../../types";
import "../../App.css";

// LOGO
import logo from "../../assets/logo/Bahçemo_green.png";

const SaleDetail = () => {
    const { storeId, id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // 👇 Kullanıcı Rolünü Çekiyoruz
    const { userRole } = useAuth();

    // Veri State'leri
    const [sale, setSale] = useState<Sale | null>(location.state?.sale || null);
    const [loading, setLoading] = useState(!location.state?.sale);

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

    const handleCancel = async () => {
        if (!storeId || !id) return;
        if (window.confirm("DİKKAT: Bu satışı İPTAL etmek üzeresiniz.\n\n- Stoklar geri yüklenecek.\n- Müşteri borcu silinecek.\n- Fiş tutarı 0lanacak.\n\nOnaylıyor musunuz?")) {
            try {
                setLoading(true);
                await cancelSaleComplete(storeId, id);
                alert("Satış başarıyla iptal edildi.");
                navigate("/sales");
            } catch (error) {
                alert("İptal sırasında hata oluştu.");
                setLoading(false);
            }
        }
    };

    const handleDelete = async () => {
        if (!storeId || !id) return;
        if (window.confirm("BU İŞLEM GERİ ALINAMAZ!\n\nSatış kaydı tamamen SİLİNECEK.\nStoklar geri yüklenecek.\n\nEmin misiniz?")) {
            try {
                setLoading(true);
                await deleteSaleComplete(storeId, id);
                alert("Kayıt tamamen silindi.");
                navigate("/sales");
            } catch (error) {
                alert("Silme sırasında hata oluştu.");
                setLoading(false);
            }
        }
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>Yükleniyor...</div>;
    if (!sale) return <div className="page-container">Kayıt bulunamadı.</div>;

    // --- HESAPLAMALAR ---
    const subTotal = sale.items.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
    const totalDiscount = sale.items.reduce((acc, item) => acc + ((Number(item.discount) || 0) * Number(item.quantity)), 0);

    // Durum Kontrolleri
    const isCancelled = sale.items.every(i => i.deliveryStatus === 'İptal') || sale.grandTotal === 0;

    // 👇 Tüm ürünler teslim edildiyse "Tamamlandı" sayılır.
    const isAllDelivered = sale.items.every(i => i.deliveryStatus === 'Teslim Edildi');

    return (
        <div className="page-container">

            {/* ÜST BUTONLAR (Yazdırmada Gizlenir) */}
            <div className="no-print" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => navigate(-1)} className="btn btn-secondary">← Listeye Dön</button>

                <div style={{ display: 'flex', gap: '10px' }}>

                    {/* 👇 SADECE ADMIN GÖREBİLİR */}
                    {userRole === 'admin' && (
                        <>
                            {/* İptal Butonu: Zaten iptal değilse VE Tamamlanmamışsa görünür */}
                            {!isCancelled && !isAllDelivered && (
                                <button onClick={handleCancel} className="btn btn-warning" style={{ backgroundColor: '#f39c12' }}>
                                    İptal Et
                                </button>
                            )}

                            {/* Sil Butonu: Admin her zaman görebilir */}
                            <button onClick={handleDelete} className="btn btn-danger">
                                Sil
                            </button>
                        </>
                    )}

                    <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        Yazdır / PDF
                    </button>
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
                        padding: '20px', borderRadius: '20px', pointerEvents: 'none'
                    }}>
                        İPTAL
                    </div>
                )}

                {/* 1. BAŞLIK & LOGO */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f0f0f0', paddingBottom: '30px', marginBottom: '30px' }}>
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

                {/* 2. MÜŞTERİ VE TESLİMAT BİLGİLERİ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', gap: '40px' }}>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#95a5a6', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px' }}>Müşteri Bilgileri</h4>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '5px' }}>{sale.customerName}</div>
                        <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
                            {sale.address ? sale.address : 'Adres belirtilmedi'}<br />
                            {sale.city && sale.district ? `${sale.district} / ${sale.city}` : ''}
                        </div>
                        <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: '600' }}>{sale.phone}</div>
                    </div>

                    <div style={{ flex: 1, textAlign: 'right' }}>
                        <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#95a5a6', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px' }}>Sipariş Detayları</h4>
                        <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.8' }}>
                            <div><strong>Satış Temsilcisi:</strong> {sale.personnelName}</div>
                            <div><strong>Termin Tarihi:</strong> <span style={{ color: '#e67e22', fontWeight: 'bold' }}>{formatDate(sale.deadline)}</span></div>

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

                                {/* 1. SÜTUN: Ürün Adı + Ebat + Kategori */}
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
                                    {item.productNote && (
                                        <div style={{ fontSize: '11px', color: '#e74c3c', marginTop: '4px', fontStyle: 'italic' }}>
                                            *{item.productNote}
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
                                <td style={{ padding: '15px 12px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                                    {item.quantity}
                                </td>

                                {/* 5. SÜTUN: Birim Fiyat */}
                                <td style={{ padding: '15px 12px', textAlign: 'right', fontSize: '14px' }}>
                                    {Number(item.price).toFixed(2)} ₺
                                    {Number(item.discount) > 0 && (
                                        <div style={{ fontSize: '10px', color: 'red' }}>-{Number(item.discount)} ind.</div>
                                    )}
                                </td>

                                {/* 6. SÜTUN: Toplam Fiyat */}
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

                {/* 5. DİPNOT / FOOTER */}
                <div style={{ marginTop: '60px', borderTop: '1px solid #eee', paddingTop: '20px', textAlign: 'center', color: '#95a5a6', fontSize: '12px' }}>
                    <p><strong>Bahçemo Home Garden</strong> -www.bahcemo.com.tr</p>
                </div>

            </div>
        </div>
    );
};

export default SaleDetail;