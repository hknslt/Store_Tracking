// src/pages/purchases/PurchaseList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

import { getPurchasesByStore } from "../../services/purchaseService";
import { getStores } from "../../services/storeService";
import { 
    getCategories, 
    getCushions, 
    getColors, 
    getDimensions 
} from "../../services/definitionService";

import type { Purchase, Store, Personnel, Category, Cushion, Color, Dimension } from "../../types";
import "../../App.css"; 

const PurchaseList = () => {
    const { currentUser } = useAuth();

    // --- STATE'LER ---
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [stores, setStores] = useState<Store[]>([]);

    // Tanımlamalar
    const [categories, setCategories] = useState<Category[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);

    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    // --- 1. BAŞLANGIÇ VERİLERİ ---
    useEffect(() => {
        const initData = async () => {
            if (!currentUser) return;

            try {
                const [storesData, catsData, cushsData, colsData, dimsData] = await Promise.all([
                    getStores(),
                    getCategories(),
                    getCushions(),
                    getColors(),
                    getDimensions()
                ]);

                setStores(storesData);
                setCategories(catsData);
                setCushions(cushsData);
                setColors(colsData);
                setDimensions(dimsData);

                // Yetki Kontrolü
                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data() as Personnel;
                    if (userData.role === 'admin') {
                        setIsAdmin(true);
                    } else {
                        setIsAdmin(false);
                        setSelectedStoreId(userData.storeId);
                    }
                }
            } catch (error) {
                console.error("Veri hatası:", error);
            } finally {
                setLoading(false);
            }
        };

        initData();
    }, [currentUser]);

    // --- 2. FİŞLERİ ÇEK ---
    useEffect(() => {
        const loadPurchases = async () => {
            if (!selectedStoreId) {
                setPurchases([]);
                return;
            }
            const data = await getPurchasesByStore(selectedStoreId);
            data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setPurchases(data);
        };

        loadPurchases();
    }, [selectedStoreId]);

    // --- YARDIMCILAR ---
    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR');
    };

    const getCatName = (id?: string) => categories.find(c => c.id === id)?.categoryName || "";
    const getCushionName = (id?: string) => cushions.find(c => c.id === id)?.cushionName || "-";
    const getColorName = (id?: string) => colors.find(c => c.id === id)?.colorName || "-";
    const getDimensionName = (id?: string | null) => id ? (dimensions.find(d => d.id === id)?.dimensionName || "") : "";

    const calculateGrandTotal = (items: any[]) => {
        return items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.amount)), 0);
    };

    const toggleRow = (id: string) => {
        setExpandedRowId(expandedRowId === id ? null : id);
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {/* --- HEADER --- */}
            <div className="page-header">
                <div className="page-title">
                    <h2>Alış Fişleri Listesi</h2>
                    <p>Geçmiş mal kabul ve iade işlemleri</p>
                </div>
                <Link to="/purchases/add" className="btn btn-primary">
                    + Yeni Fiş Gir
                </Link>
            </div>

            {/* --- FİLTRE --- */}
            <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <label style={{ fontWeight: '600', color: '#2c3e50' }}>Mağaza Seçiniz:</label>
                    {isAdmin ? (
                        <select
                            className="form-input"
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                            style={{ maxWidth: '300px' }}
                        >
                            <option value="">-- Seçiniz --</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                        </select>
                    ) : (
                        <div style={{ fontWeight: 'bold', color: '#2980b9', padding: '10px', backgroundColor: '#ecf0f1', borderRadius: '5px' }}>
                            📍 {stores.find(s => s.id === selectedStoreId)?.storeName || "Mağazam"}
                        </div>
                    )}
                </div>
            </div>

            {/* --- ANA TABLO --- */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {selectedStoreId ? (
                        <table className="data-table dense">
                            <thead>
                                <tr style={{ backgroundColor: '#f8f9fa' }}>
                                    <th style={{ width: '5%' }}>Detay</th>
                                    <th style={{ width: '15%' }}>Tarih</th>
                                    <th style={{ width: '20%' }}>Fiş No</th>
                                    <th style={{ width: '25%' }}>Personel</th>
                                    <th style={{ width: '15%', textAlign: 'center' }}>Kalem</th>
                                    <th style={{ width: '20%', textAlign: 'right' }}>Toplam Tutar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.length > 0 ? (
                                    purchases.map(p => {
                                        const calculatedTotal = calculateGrandTotal(p.items);
                                        return (
                                            <>
                                                {/* ANA SATIR */}
                                                <tr
                                                    key={p.id}
                                                    onClick={() => p.id && toggleRow(p.id)}
                                                    style={{
                                                        cursor: 'pointer',
                                                        backgroundColor: expandedRowId === p.id ? '#e8f6f3' : 'white',
                                                        borderBottom: expandedRowId === p.id ? 'none' : '1px solid #eee'
                                                    }}
                                                    className="hover-row"
                                                >
                                                    <td style={{ textAlign: 'center', fontSize: '16px', color: '#3498db' }}>
                                                        {expandedRowId === p.id ? '▼' : '▶'}
                                                    </td>
                                                    <td>{formatDate(p.date)}</td>
                                                    <td style={{ fontWeight: '600', color: '#2c3e50' }}>{p.receiptNo}</td>
                                                    <td>{p.personnelName}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className="badge" style={{ backgroundColor: '#ecf0f1', color: '#555' }}>
                                                            {p.items.length}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#27ae60' }}>
                                                        {calculatedTotal.toFixed(2)} ₺
                                                    </td>
                                                </tr>

                                                {/* DETAY SATIRI (AÇILIR KAPANIR) */}
                                                {expandedRowId === p.id && (
                                                    <tr style={{ backgroundColor: '#fbfbfb', borderBottom: '2px solid #ddd' }}>
                                                        <td colSpan={6} style={{ padding: '15px 20px' }}>
                                                            <div style={{ padding: '10px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: 'white' }}>
                                                                <h5 style={{ margin: '0 0 10px 0', color: '#7f8c8d', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                                                                    📄 Fiş İçeriği
                                                                </h5>

                                                                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                                                                    <thead>
                                                                        <tr style={{ color: '#95a5a6', textAlign: 'left', borderBottom: '1px solid #eee' }}>
                                                                            <th style={{ padding: 8, width: '30%' }}>Ürün Bilgisi</th> {/* Başlık Değişti */}
                                                                            <th style={{ padding: 8, width: '10%' }}>Renk</th>
                                                                            <th style={{ padding: 8, width: '10%' }}>Minder</th>
                                                                            <th style={{ padding: 8, width: '15%' }}>Açıklama</th>
                                                                            <th style={{ padding: 8, width: '10%' }}>Durum</th>
                                                                            <th style={{ padding: 8, width: '15%', textAlign: 'right' }}>Hesap</th>
                                                                            <th style={{ padding: 8, width: '10%', textAlign: 'right' }}>Toplam</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {p.items.map((item, idx) => (
                                                                            <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                                                                
                                                                                {/* GÜNCELLENEN ALAN: Ürün Adı + Ebat + Kategori */}
                                                                                <td style={{ padding: 8 }}>
                                                                                    <span style={{ fontWeight: '600', color: '#34495e', marginRight: '5px' }}>
                                                                                        {item.productName.split('-')[0].trim()}
                                                                                    </span>
                                                                                    
                                                                                    {item.dimensionId && (
                                                                                        <span style={{ color: '#e67e22', fontWeight: 'bold', marginRight: '5px' }}>
                                                                                            {getDimensionName(item.dimensionId)}
                                                                                        </span>
                                                                                    )}

                                                                                    <span style={{ color: '#7f8c8d', fontSize: '12px', fontStyle: 'italic' }}>
                                                                                        {getCatName(item.categoryId)}
                                                                                    </span>
                                                                                </td>

                                                                                <td style={{ padding: 8 }}>
                                                                                    {getColorName(item.colorId)}
                                                                                </td>
                                                                                
                                                                                <td style={{ padding: 8 }}>
                                                                                    {getCushionName(item.cushionId)}
                                                                                </td>

                                                                                <td style={{ padding: 8, fontStyle: 'italic', color: '#999' }}>
                                                                                    {item.explanation || "-"}
                                                                                </td>

                                                                                <td style={{ padding: 8 }}>
                                                                                    <span style={{
                                                                                        color: item.status === 'Alış' ? 'green' : 'red',
                                                                                        fontWeight: 'bold', fontSize: '11px'
                                                                                    }}>
                                                                                        {item.status}
                                                                                    </span>
                                                                                </td>

                                                                                <td style={{ padding: 8, textAlign: 'right', color: '#666' }}>
                                                                                    {item.quantity} x {Number(item.amount).toFixed(2)} ₺
                                                                                </td>

                                                                                <td style={{ padding: 8, textAlign: 'right', fontWeight: 'bold' }}>
                                                                                    {(item.quantity * Number(item.amount)).toFixed(2)} ₺
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                                            Bu mağazaya ait fiş kaydı bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#95a5a6' }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏬</div>
                            <p>Fişleri görüntülemek için lütfen yukarıdan bir mağaza seçiniz.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PurchaseList;