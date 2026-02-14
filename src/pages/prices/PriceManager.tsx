// src/pages/prices/PriceManager.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProducts } from "../../services/productService";
import { savePriceList, getPriceListById, getPriceLists } from "../../services/priceService"; // 🔥 getPriceLists eklendi
import { getGroups, getCategories, getDimensions } from "../../services/definitionService";
import { getStores } from "../../services/storeService";
import type { Product, Group, Category, Dimension, Store, PriceListModel } from "../../types";
import "../../App.css";
import React from "react";

const PriceManager = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- TEMEL VERİLER ---
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);
    const [stores, setStores] = useState<Store[]>([]);

    // 🔥 TÜM FİYAT LİSTELERİ (Çakışma kontrolü için)
    const [allLists, setAllLists] = useState<PriceListModel[]>([]);

    // --- LİSTE BİLGİLERİ (METADATA) ---
    const [listName, setListName] = useState("");
    const [listType, setListType] = useState<'perakende' | 'toptan'>('perakende');
    const [selectedStores, setSelectedStores] = useState<string[]>([]);

    // --- FİYAT HARİTASI ---
    const [priceMap, setPriceMap] = useState<Record<string, number>>({});

    // UI Durumları
    const [openGroupIds, setOpenGroupIds] = useState<string[]>([]);
    const [openCategoryIds, setOpenCategoryIds] = useState<string[]>([]);
    const [openProductDetails, setOpenProductDetails] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 4000); // Mesaj süresi biraz uzatıldı okunsun diye
            return () => clearTimeout(timer);
        }
    }, [message]);

    // --- VERİLERİ YÜKLE ---
    useEffect(() => {
        const loadData = async () => {
            try {
                // 🔥 getPriceLists'i de çekiyoruz
                const [g, c, p, d, s, lists] = await Promise.all([
                    getGroups(), getCategories(), getProducts(), getDimensions(), getStores(), getPriceLists()
                ]);
                setGroups(g); setCategories(c); setProducts(p); setDimensions(d); setStores(s); setAllLists(lists);

                if (id) {
                    const listData = await getPriceListById(id);
                    if (listData) {
                        setListName(listData.name);
                        setListType(listData.type);
                        setSelectedStores(listData.storeIds || []);
                        setPriceMap(listData.prices || {});
                    } else {
                        navigate('/prices');
                    }
                }
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        loadData();
    }, [id, navigate]);

    // --- HANDLERS ---
    const toggleStore = (storeId: string) => {
        setSelectedStores(prev =>
            prev.includes(storeId) ? prev.filter(x => x !== storeId) : [...prev, storeId]
        );
    };

    const toggleGroup = (groupId: string) => setOpenGroupIds(prev => prev.includes(groupId) ? prev.filter(x => x !== groupId) : [...prev, groupId]);
    const toggleCategory = (catId: string) => setOpenCategoryIds(prev => prev.includes(catId) ? prev.filter(x => x !== catId) : [...prev, catId]);
    const toggleProductDetails = (prodId: string) => setOpenProductDetails(prev => prev.includes(prodId) ? prev.filter(x => x !== prodId) : [...prev, prodId]);

    const handlePriceChange = (productId: string, dimensionId: string | null, val: string) => {
        const key = dimensionId ? `${productId}_${dimensionId}` : `${productId}_std`;
        setPriceMap(prev => ({ ...prev, [key]: Number(val) }));
    };

    // KAYDETME VE ÇAKIŞMA KONTROLÜ
    const handleSaveList = async () => {
        if (!listName.trim()) return setMessage({ type: 'error', text: 'Lütfen liste adını giriniz.' });
        if (selectedStores.length === 0) return setMessage({ type: 'error', text: 'Lütfen en az bir mağaza seçiniz.' });

        // 🔥 ÇAKIŞMA KONTROLÜ (Aynı türden listesi olan mağazaları bul)
        const conflictingStores: string[] = [];

        selectedStores.forEach(storeId => {
            const conflict = allLists.find(list =>
                list.id !== id && // Kendisiyle karşılaştırma
                list.type === listType && // Aynı türde mi (perakende/toptan)
                list.storeIds.includes(storeId) // Bu mağaza o listede var mı?
            );

            if (conflict) {
                const storeName = stores.find(s => s.id === storeId)?.storeName;
                if (storeName) conflictingStores.push(storeName);
            }
        });

        // Eğer çakışan mağaza varsa hata ver ve işlemi durdur
        if (conflictingStores.length > 0) {
            const typeText = listType === 'perakende' ? 'Perakende' : 'Toptan';
            return setMessage({
                type: 'error',
                text: `Hata: ${conflictingStores.join(', ')} mağazalarının zaten bir '${typeText}' fiyat listesi bulunuyor!`
            });
        }

        // Çakışma yoksa kaydet
        setSaving(true);
        try {
            const listData: PriceListModel = {
                name: listName,
                type: listType,
                storeIds: selectedStores,
                prices: priceMap
            };

            const savedId = await savePriceList(listData, id); // 🔥 ID'yi alıyoruz
            setMessage({ type: 'success', text: `✅ Fiyat listesi başarıyla kaydedildi!` });

            // 🔥 Kaydettikten sonra Detay sayfasına yönlendir
            setTimeout(() => navigate(`/prices/detail/${savedId}`), 1000);

        } catch (error) {
            setMessage({ type: 'error', text: "Kaydetme sırasında bir hata oluştu!" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {message && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, padding: '15px 25px', borderRadius: '8px', color: 'white', fontWeight: '600', backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    {message.text}
                </div>
            )}

            <div className="modern-header" style={{ marginBottom: '20px' }}>
                <div>
                    <h2>{id ? 'Fiyat Listesini Düzenle' : 'Yeni Fiyat Listesi Oluştur'}</h2>
                    <p>Liste ayarlarını ve ürün fiyatlarını buradan yapılandırın.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate('/prices/list')} className="modern-btn btn-secondary">İptal / Geri</button>
                    <button onClick={handleSaveList} disabled={saving} className="modern-btn btn-primary">
                        {saving ? 'Kaydediliyor...' : 'Listeyi Kaydet'}
                    </button>
                </div>
            </div>

            {/* 1. BÖLÜM: LİSTE AYARLARI */}
            <div className="card" style={{ padding: '20px', marginBottom: '25px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#0f172a' }}>⚙️ Liste Ayarları</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div className="form-group">
                        <label className="form-label">Fiyat Listesi Adı</label>
                        <input type="text" className="form-input" placeholder="Fiyat Listesi Adı" value={listName} onChange={e => setListName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Liste Türü</label>
                        <select className="form-input" value={listType} onChange={e => setListType(e.target.value as 'perakende' | 'toptan')}>
                            <option value="perakende">Perakende (Son Kullanıcı)</option>
                            <option value="toptan">Toptan (Bayi Satışı)</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Kullanılacak Mağazalar (Birden fazla seçebilirsiniz)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', padding: '15px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                        {stores.map(store => (
                            <label key={store.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedStores.includes(store.id!)}
                                    onChange={() => toggleStore(store.id!)}
                                    style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                                />
                                {store.storeName}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. BÖLÜM: FİYAT GİRİŞİ */}
            <h3 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '15px' }}>🏷️ Ürün Fiyatları</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {groups.map(group => {
                    const isGroupOpen = openGroupIds.includes(group.id!);
                    const groupCats = categories.filter(c => c.groupId === group.id);

                    return (
                        <div key={group.id} className="card" style={{ padding: 0, overflow: 'hidden', border: isGroupOpen ? '2px solid #3b82f6' : '1px solid #ddd' }}>
                            <div onClick={() => toggleGroup(group.id!)} style={{ padding: '15px 20px', backgroundColor: isGroupOpen ? '#eff6ff' : '#f9f9f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '16px', color: '#1e293b' }}>
                                <span>📁 {group.groupName}</span>
                                <span>{isGroupOpen ? '▲' : '▼'}</span>
                            </div>

                            {isGroupOpen && (
                                <div style={{ padding: '10px 20px 20px 20px', backgroundColor: '#fff' }}>
                                    {groupCats.map(cat => {
                                        const isCatOpen = openCategoryIds.includes(cat.id!);
                                        const catProducts = products.filter(p => p.categoryId === cat.id).sort((a, b) => a.productName.localeCompare(b.productName));

                                        if (catProducts.length === 0) return null;

                                        return (
                                            <div key={cat.id} style={{ marginTop: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                                <div onClick={() => toggleCategory(cat.id!)} style={{ padding: '10px 15px', backgroundColor: '#fff', borderBottom: isCatOpen ? '1px solid #eee' : 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600', color: '#e67e22', fontSize: '14px' }}>
                                                    <span>📂 {cat.categoryName}</span>
                                                    <span style={{ fontSize: '12px', color: '#999' }}>{isCatOpen ? 'Kapat' : 'Aç'}</span>
                                                </div>

                                                {isCatOpen && (
                                                    <div style={{ padding: '10px' }}>
                                                        <table className="modern-table">
                                                            <thead>
                                                                <tr style={{ backgroundColor: '#f8f9fa' }}>
                                                                    <th style={{ width: '40%' }}>Ürün Adı</th>
                                                                    <th style={{ width: '30%' }}>Standart Fiyat</th>
                                                                    <th style={{ width: '30%', textAlign: 'center' }}>Ebat Fiyatları</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {catProducts.map(p => {
                                                                    const stdKey = `${p.id}_std`;
                                                                    const showDetails = openProductDetails.includes(p.id!);

                                                                    return (
                                                                        <React.Fragment key={p.id}>
                                                                            <tr style={{ borderBottom: '1px solid #f1f1f1' }}>
                                                                                <td style={{ fontWeight: '500' }}>{p.productName}</td>
                                                                                <td>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                                        <input type="number" placeholder="0" value={priceMap[stdKey] || ''} onChange={e => handlePriceChange(p.id!, null, e.target.value)} className="form-input" style={{ width: '100px', fontWeight: 'bold', textAlign: 'right', padding: '6px' }} /> ₺
                                                                                    </div>
                                                                                </td>
                                                                                <td style={{ textAlign: 'center' }}>
                                                                                    <button onClick={() => toggleProductDetails(p.id!)} style={{ border: '1px solid #cbd5e1', background: showDetails ? '#f1f5f9' : 'white', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#475569', fontWeight: '600' }}>
                                                                                        {showDetails ? 'Ebatları Gizle' : '+ Ebat Fiyatları'}
                                                                                    </button>
                                                                                </td>
                                                                            </tr>

                                                                            {showDetails && (
                                                                                <tr style={{ backgroundColor: '#fcfcfc' }}>
                                                                                    <td colSpan={3} style={{ padding: '15px 15px 15px 50px' }}>
                                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                                                                                            {dimensions.map(dim => {
                                                                                                const dimKey = `${p.id}_${dim.id}`;
                                                                                                return (
                                                                                                    <div key={dim.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '6px', background: 'white' }}>
                                                                                                        <span style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>{dim.dimensionName}</span>
                                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                                                            <input type="number" value={priceMap[dimKey] || ''} onChange={e => handlePriceChange(p.id!, dim.id!, e.target.value)} style={{ width: '80px', padding: '4px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right', outline: 'none' }} />
                                                                                                            <span style={{ fontSize: '12px', color: '#64748b' }}>₺</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PriceManager;