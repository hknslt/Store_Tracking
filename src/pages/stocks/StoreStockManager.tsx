// src/pages/stocks/StoreStockManager.tsx
import { useEffect, useState } from "react";
import { getStores } from "../../services/storeService";
import { getProducts } from "../../services/productService";
import { getStoreProducts, saveStoreProductStock } from "../../services/storeStockService";
import { getGroups, getCategories } from "../../services/definitionService";
import type { Store, Product, Group, Category } from "../../types";
import "../../App.css"; // Ortak CSS Dosyası

const StoreStockManager = () => {
    // --- STATE'LER ---
    const [stores, setStores] = useState<Store[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    const [selectedStoreId, setSelectedStoreId] = useState("");
    
    // Stok Haritası: { "urun_id": 50 }
    const [stockMap, setStockMap] = useState<Record<string, number>>({});
    
    const [loading, setLoading] = useState(true);
    const [successId, setSuccessId] = useState<string | null>(null); // Hangi satır güncellendi?

    // Toast Mesaj State'i
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // --- YARDIMCI: TOAST GÖSTER ---
    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // 1. Genel verileri çek
    useEffect(() => {
        const loadBaseData = async () => {
            try {
                const [sData, pData, gData, cData] = await Promise.all([
                    getStores(),
                    getProducts(),
                    getGroups(),
                    getCategories()
                ]);
                setStores(sData);
                setProducts(pData);
                setGroups(gData);
                setCategories(cData);
            } catch (error) {
                console.error(error);
                showToast('error', "Veriler yüklenirken hata oluştu.");
            } finally {
                setLoading(false);
            }
        };
        loadBaseData();
    }, []);

    // 2. Mağaza seçilince verileri çek
    useEffect(() => {
        if (!selectedStoreId) {
            setStockMap({});
            return;
        }

        const fetchStoreData = async () => {
            // Sadece tabloyu loading yapabiliriz veya arkaplanda çekebiliriz
            // UX açısından burada tüm sayfayı kilitlemek yerine tabloyu bekletmek daha şık olur ama
            // şimdilik basit tutalım.
            try {
                const storeProducts = await getStoreProducts(selectedStoreId);
                const mapping: Record<string, number> = {};
                storeProducts.forEach((item: any) => {
                    mapping[item.id] = item.stock;
                });
                setStockMap(mapping);
            } catch (error) {
                console.error(error);
                showToast('error', "Mağaza stok bilgisi çekilemedi.");
            }
        };

        fetchStoreData();
    }, [selectedStoreId]);


    // İsim Bulucu Helper
    const getName = (list: any[], id: string | undefined, nameKey: string) => {
        if (!id) return "-";
        const item = list.find(x => x.id === id);
        return item ? item[nameKey] : ""; 
    };

    // Input değişince local state güncelle
    const handleStockChange = (productId: string, val: string) => {
        setStockMap(prev => ({
            ...prev,
            [productId]: Number(val)
        }));
    };

    // KAYDET İŞLEMİ
    const handleSave = async (productId: string) => {
        if (!selectedStoreId) {
            showToast('error', "Lütfen önce bir mağaza seçiniz.");
            return;
        }
        
        const currentStock = stockMap[productId] || 0;
        
        try {
            await saveStoreProductStock(selectedStoreId, productId, currentStock);
            
            // Başarılı görsel efekti
            setSuccessId(productId);
            showToast('success', "Stok güncellendi.");
            setTimeout(() => setSuccessId(null), 2000);
        } catch (error) {
            console.error(error);
            showToast('error', "Güncelleme sırasında hata oluştu.");
        }
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            
            {/* --- TOAST MESAJI --- */}
            {message && (
                <div className="toast-container">
                    <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                        {message.type === 'success' ? '✅' : '⚠️'} {message.text}
                    </div>
                </div>
            )}

            {/* --- BAŞLIK --- */}
            <div className="page-header">
                <div className="page-title">
                    <h2>Mağaza Stok Takibi</h2>
                    <p>Mağazalar bazında ürün stoklarını yönetin</p>
                </div>
            </div>

            {/* --- MAĞAZA SEÇİM KARTI --- */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-body" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <label style={{ fontWeight: 'bold', color: '#2c3e50' }}>Aktif Mağaza:</label>
                    <select 
                        className="form-input"
                        value={selectedStoreId} 
                        onChange={(e) => setSelectedStoreId(e.target.value)}
                        style={{ maxWidth: '300px' }}
                    >
                        <option value="">-- Mağaza Seçiniz --</option>
                        {stores.map(s => (
                            <option key={s.id} value={s.id}>{s.storeName}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* --- LİSTE KARTI --- */}
            <div className="card">
                <div className="card-body">
                    {selectedStoreId ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Ürün Adı</th>
                                    <th>Kategori / Grup</th>
                                    <th style={{ textAlign: 'center' }}>Mağaza Stoğu</th>
                                    <th style={{ textAlign: 'right' }}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p) => (
                                    <tr key={p.id}>
                                        {/* Ürün Adı */}
                                        <td style={{ fontWeight: '500' }}>
                                            {p.productName}
                                        </td>
                                        
                                        {/* Detay */}
                                        <td style={{ fontSize: '13px', color: '#7f8c8d' }}>
                                            {getName(groups, p.groupId, 'groupName')}
                                            {' / '}
                                            {getName(categories, p.categoryId, 'categoryName')}
                                        </td>

                                        {/* Stok Input */}
                                        <td style={{ textAlign: 'center' }}>
                                            <input 
                                                type="number" 
                                                className="form-input"
                                                value={stockMap[p.id!] || 0} 
                                                onChange={(e) => handleStockChange(p.id!, e.target.value)}
                                                style={{ width: '80px', textAlign: 'center', margin: '0 auto' }}
                                                min="0"
                                            />
                                        </td>

                                        {/* Buton */}
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                onClick={() => p.id && handleSave(p.id)}
                                                className={successId === p.id ? "btn btn-success" : "btn btn-primary"}
                                                style={{ minWidth: '100px' }}
                                            >
                                                {successId === p.id ? "✔ Kaydedildi" : "Güncelle"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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