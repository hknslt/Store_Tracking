// src/pages/stocks/StoreStockManager.tsx
import { useEffect, useState } from "react";
import { getStores } from "../../services/storeService";
import { getStoreStocks, updateStoreStock } from "../../services/storeStockService";
// Tanımları çekmek için servisler
import { getProducts } from "../../services/productService";
import { getCategories, getColors, getDimensions } from "../../services/definitionService";

import type { Store, Product, Category, Color, Dimension } from "../../types";
import "../../App.css";

// Veritabanından gelen stok satırı tipi
interface StockRow {
    id: string;          // Stock Unique ID
    productId: string;
    colorId: string;
    dimensionId?: string | null;
    quantity: number;
    productName: string; // Yedek olarak tutulan birleşik isim
}

const StoreStockManager = () => {
    // --- STATE'LER ---
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState("");

    // Tanım Listeleri (Eşleştirme için)
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);

    const [stocks, setStocks] = useState<StockRow[]>([]);
    const [editMap, setEditMap] = useState<Record<string, number>>({});

    const [loading, setLoading] = useState(true);
    const [successId, setSuccessId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // 1. TÜM TANIMLARI ÇEK
    useEffect(() => {
        const loadDefinitions = async () => {
            try {
                const [sData, pData, cData, colData, dimData] = await Promise.all([
                    getStores(),
                    getProducts(),
                    getCategories(),
                    getColors(),
                    getDimensions()
                ]);
                setStores(sData);
                setProducts(pData);
                setCategories(cData);
                setColors(colData);
                setDimensions(dimData);
            } catch (error) {
                console.error("Veri hatası:", error);
            } finally {
                setLoading(false);
            }
        };
        loadDefinitions();
    }, []);

    // 2. MAĞAZA SEÇİLİNCE STOKLARI ÇEK
    useEffect(() => {
        if (!selectedStoreId) {
            setStocks([]);
            setEditMap({});
            return;
        }

        const loadStocks = async () => {
            try {
                // Servisten gelen verinin tipini zorluyoruz (cast)
                const data = await getStoreStocks(selectedStoreId) as unknown as StockRow[];
                setStocks(data);

                const initialMap: Record<string, number> = {};
                data.forEach(s => initialMap[s.id] = s.quantity);
                setEditMap(initialMap);

            } catch (error) {
                console.error(error);
                showToast('error', "Stok bilgileri alınamadı.");
            }
        };

        loadStocks();
    }, [selectedStoreId]);

    // Input Değişimi
    const handleStockChange = (stockId: string, val: string) => {
        setEditMap(prev => ({ ...prev, [stockId]: Number(val) }));
    };

    // Kaydetme İşlemi
    const handleSave = async (stockId: string) => {
        const newQuantity = editMap[stockId];
        if (newQuantity === undefined) return;

        try {
            await updateStoreStock(selectedStoreId, stockId, newQuantity);
            setSuccessId(stockId);
            showToast('success', "Stok güncellendi.");
            setTimeout(() => setSuccessId(null), 2000);
        } catch (error) {
            console.error(error);
            showToast('error', "Güncelleme hatası.");
        }
    };

    // --- YARDIMCI: İSİM BULUCULAR ---
    const getProductName = (id: string) => products.find(p => p.id === id)?.productName || "-";
    const getCategoryNameByProdId = (prodId: string) => {
        const product = products.find(p => p.id === prodId);
        if (!product) return "";
        return categories.find(c => c.id === product.categoryId)?.categoryName || "";
    };
    const getColorName = (id: string) => colors.find(c => c.id === id)?.colorName || "-";
    const getDimensionName = (id?: string | null) => id ? (dimensions.find(d => d.id === id)?.dimensionName || "") : "";

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {message && (
                <div className="toast-container">
                    <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                        {message.type === 'success' ? '✅' : '⚠️'} {message.text}
                    </div>
                </div>
            )}

            <div className="page-header">
                <div className="page-title">
                    <h2>Mağaza Stok Yönetimi</h2>
                    <p>Mağazadaki varyant bazlı stokları inceleyin ve düzenleyin</p>
                </div>
            </div>

            {/* MAĞAZA SEÇİMİ */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-body" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <label style={{ fontWeight: 'bold', color: '#2c3e50' }}>Mağaza Seçiniz:</label>
                    <select
                        className="form-input"
                        value={selectedStoreId}
                        onChange={(e) => setSelectedStoreId(e.target.value)}
                        style={{ maxWidth: '300px' }}
                    >
                        <option value="">-- Seçiniz --</option>
                        {stores.map(s => (
                            <option key={s.id} value={s.id}>{s.storeName}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* STOK LİSTESİ */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {selectedStoreId ? (
                        <>
                            {stocks.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                                    Bu mağazada henüz stok kaydı bulunmuyor.
                                </div>
                            ) : (
                                <table className="data-table dense">
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                                            <th style={{ width: '50%' }}>Ürün Bilgisi (Ad / Ebat / Kategori)</th>
                                            <th style={{ width: '20%' }}>Renk</th>
                                            <th style={{ width: '15%', textAlign: 'center' }}>Mevcut Stok</th>
                                            <th style={{ width: '15%', textAlign: 'right' }}>İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stocks.map((stock) => {
                                            const prodName = getProductName(stock.productId);
                                            const catName = getCategoryNameByProdId(stock.productId);
                                            const dimName = getDimensionName(stock.dimensionId);
                                            const colName = getColorName(stock.colorId);

                                            return (
                                                <tr key={stock.id}>

                                                    {/* 1. SÜTUN: Ürün Adı + Ebat + Kategori (Yan Yana) */}
                                                    <td style={{ padding: '12px 15px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>

                                                            {/* Ürün Adı */}
                                                            <span style={{ fontWeight: '600', color: '#34495e', fontSize: '14px' }}>
                                                                {prodName}
                                                            </span>

                                                            {/* Ebat (Varsa) */}
                                                            {dimName && dimName !== '' && (
                                                                <span style={{ color: '#e67e22', fontWeight: 'bold', fontSize: '13px' }}>
                                                                    {dimName}
                                                                </span>
                                                            )}

                                                            {/* Kategori */}
                                                            <span style={{ fontSize: '14px', color: '#95a5a6', fontStyle: 'italic' }}>
                                                                {catName}
                                                            </span>

                                                        </div>
                                                    </td>

                                                    {/* 2. SÜTUN: Renk */}
                                                    <td style={{ padding: '12px 15px', color: '#555', fontWeight: '500' }}>
                                                        {colName}
                                                    </td>

                                                    {/* 3. SÜTUN: Stok Input */}
                                                    <td style={{ textAlign: 'center' }}>
                                                        <input
                                                            type="number"
                                                            className="form-input"
                                                            value={editMap[stock.id] ?? stock.quantity}
                                                            onChange={(e) => handleStockChange(stock.id, e.target.value)}
                                                            style={{ width: '80px', textAlign: 'center', margin: '0 auto', fontWeight: 'bold' }}
                                                            min="0"
                                                        />
                                                    </td>

                                                    {/* 4. SÜTUN: Buton */}
                                                    <td style={{ textAlign: 'right', paddingRight: '15px' }}>
                                                        <button
                                                            onClick={() => handleSave(stock.id)}
                                                            className={successId === stock.id ? "btn btn-success" : "btn btn-primary"}
                                                            style={{ padding: '6px 12px', fontSize: '13px', minWidth: '90px' }}
                                                        >
                                                            {successId === stock.id ? "✔ Tamam" : "Güncelle"}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#95a5a6' }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏬</div>
                            <p>Stokları görüntülemek için lütfen yukarıdan bir mağaza seçiniz.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoreStockManager;