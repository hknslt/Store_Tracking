// src/pages/stocks/StoreStockManager.tsx
import { useEffect, useState } from "react";
import { getStores } from "../../services/storeService";
import { getStoreStocks } from "../../services/storeStockService";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

// Tanımlar
import { getProducts } from "../../services/productService";
import { getCategories, getColors, getDimensions } from "../../services/definitionService";

import type { Store, Product, Category, Color, Dimension, StoreStock, SystemUser } from "../../types";
import "../../App.css";

const StoreStockManager = () => {
    const { currentUser } = useAuth();

    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);

    // Tanımlar
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);

    const [stocks, setStocks] = useState<StoreStock[]>([]);
    const [loading, setLoading] = useState(true);

    // --- BAŞLANGIÇ ---
    useEffect(() => {
        const loadBase = async () => {
            if (!currentUser) return;
            try {
                // 1. Tanımları Çek
                const [s, p, c, col, dim] = await Promise.all([
                    getStores(), getProducts(), getCategories(), getColors(), getDimensions()
                ]);
                setStores(s); setProducts(p); setCategories(c); setColors(col); setDimensions(dim);

                // 2. Kullanıcı Rolünü Kontrol Et
                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    const u = userDoc.data() as SystemUser;

                    // Admin, Control veya Report ise yönetici yetkisi ver
                    if (['admin', 'control', 'report'].includes(u.role)) {
                        setIsAdmin(true);
                    } else {
                        // Mağaza Müdürü ise kendi mağazasını seç
                        setIsAdmin(false);
                        if (u.storeId) setSelectedStoreId(u.storeId);
                    }
                }
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        loadBase();
    }, [currentUser]);

    // --- STOKLARI GETİR ---
    useEffect(() => {
        if (!selectedStoreId) { setStocks([]); return; }
        getStoreStocks(selectedStoreId).then(setStocks);
    }, [selectedStoreId]);

    // --- YARDIMCILAR ---
    const getCatName = (prodId: string) => {
        const p = products.find(x => x.id === prodId);
        return p ? categories.find(c => c.id === p.categoryId)?.categoryName : "-";
    };
    const getColorName = (id: string) => colors.find(x => x.id === id)?.colorName || "-";
    const getDimName = (id?: string | null) => id ? dimensions.find(x => x.id === id)?.dimensionName : "";

    // 0 ise boş göster, değilse değeri göster
    const renderVal = (val: number) => val === 0 ? <span style={{ color: '#ccc' }}>-</span> : val;

    if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>Yükleniyor...</div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title">
                    <h2>Mağaza Stok Durumu</h2>
                    <p>4 Farklı stok havuzunun detaylı görünümü</p>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-body" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <label style={{ fontWeight: 'bold' }}>Mağaza:</label>
                    {isAdmin ? (
                        <select className="form-input" style={{ width: '300px' }} value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)}>
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

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {selectedStoreId ? (
                        <table className="data-table dense">
                            <thead>
                                <tr style={{ backgroundColor: '#f1f2f6' }}>
                                    <th style={{ width: '30%' }}>Ürün Bilgisi</th>
                                    <th style={{ width: '15%' }}>Renk</th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#d4edda', width: '12%', color: '#155724' }}>Serbest<br />Stok</th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#fff3cd', width: '12%', color: '#856404' }}>Müşteriye<br />Ayrılan</th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#d1ecf1', width: '12%', color: '#0c5460' }}>Gelecek<br />(Depo)</th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#f8d7da', width: '12%', color: '#721c24' }}>Gelecek<br />(Müşteri)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stocks.length > 0 ? (
                                    stocks.map(stock => (
                                        <tr key={stock.id} style={{ borderBottom: '1px solid #f9f9f9' }}>

                                            {/* ÜRÜN BİLGİSİ (Modern Format) */}
                                            <td style={{ padding: '12px' }}>
                                                <div>
                                                    <span style={{ fontWeight: '600', color: '#34495e', marginRight: '6px' }}>
                                                        {stock.productName.split('-')[0].trim()}
                                                    </span>
                                                    {stock.dimensionId && (
                                                        <span style={{ color: '#e67e22', fontWeight: '600', marginRight: '6px' }}>
                                                            {getDimName(stock.dimensionId)}
                                                        </span>
                                                    )}
                                                    <span style={{ color: '#7f8c8d', fontSize: '13px' }}>
                                                        ({getCatName(stock.productId)})
                                                    </span>
                                                </div>
                                            </td>

                                            <td style={{ color: '#555' }}>{getColorName(stock.colorId)}</td>

                                            {/* 1. SERBEST STOK */}
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#27ae60', fontSize: '16px', backgroundColor: '#f0fff4' }}>
                                                {renderVal(stock.freeStock)}
                                            </td>

                                            {/* 2. REZERVE STOK */}
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#f39c12', backgroundColor: '#fffcf5' }}>
                                                {renderVal(stock.reservedStock)}
                                            </td>

                                            {/* 3. BEKLENEN (Depo) */}
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#3498db', backgroundColor: '#f0f9ff' }}>
                                                {renderVal(stock.incomingStock)}
                                            </td>

                                            {/* 4. BEKLENEN MÜŞTERİ */}
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#e74c3c', backgroundColor: '#fff5f5' }}>
                                                {renderVal(stock.incomingReservedStock)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                                            Bu mağazada şu an stok bulunmuyor.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏬</div>
                            Lütfen mağaza seçiniz.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoreStockManager;