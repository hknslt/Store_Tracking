// src/pages/prices/PriceManager.tsx
import { useEffect, useState } from "react";
import { getProducts } from "../../services/productService";
import { getAllPrices, saveProductPrice } from "../../services/priceService";
import { getGroups, getCategories, getDimensions } from "../../services/definitionService";
import type { Product, Group, Category, Dimension } from "../../types";
import "../../App.css";

const PriceManager = () => {
    // --- STATE ---
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);

    // Fiyatlar (local state)
    const [priceMap, setPriceMap] = useState<Record<string, number>>({});
    // Veritabanındaki orijinal fiyatlar (Değişiklik kontrolü için)
    const [originalPrices, setOriginalPrices] = useState<Record<string, number>>({});

    // Açık Perdeler (Accordion)
    const [openGroupIds, setOpenGroupIds] = useState<string[]>([]);
    const [openCategoryIds, setOpenCategoryIds] = useState<string[]>([]);
    const [openProductDetails, setOpenProductDetails] = useState<string[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Mesaj State'i (Toast)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Değişiklik var mı?
    const hasChanges = JSON.stringify(priceMap) !== JSON.stringify(originalPrices);

    // --- BAŞLANGIÇ ---
    useEffect(() => {
        const loadData = async () => {
            try {
                const [g, c, p, d, pr] = await Promise.all([
                    getGroups(), getCategories(), getProducts(), getDimensions(), getAllPrices()
                ]);
                setGroups(g); setCategories(c); setProducts(p); setDimensions(d);

                const mapping: Record<string, number> = {};
                pr.forEach(item => {
                    const key = item.dimensionId ? `${item.productId}_${item.dimensionId}` : `${item.productId}_std`;
                    mapping[key] = item.amount;
                });
                setPriceMap(mapping);
                setOriginalPrices(mapping);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        loadData();
    }, []);

    // --- İŞLEMLER ---

    const toggleGroup = (id: string) => {
        setOpenGroupIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleCategory = (id: string) => {
        setOpenCategoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleProductDetails = (id: string) => {
        setOpenProductDetails(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handlePriceChange = (productId: string, dimensionId: string | null, val: string) => {
        const key = dimensionId ? `${productId}_${dimensionId}` : `${productId}_std`;
        setPriceMap(prev => ({ ...prev, [key]: Number(val) }));
    };

    // TOPLU KAYDETME
    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const promises: Promise<void>[] = [];

            Object.keys(priceMap).forEach(key => {
                if (priceMap[key] !== originalPrices[key]) {
                    const [productId, dimPart] = key.split('_');
                    const dimensionId = dimPart === 'std' ? null : dimPart;
                    promises.push(saveProductPrice(productId, dimensionId, priceMap[key]));
                }
            });

            await Promise.all(promises);

            setOriginalPrices(priceMap);
            setMessage({ type: 'success', text: "✅ Tüm değişiklikler başarıyla kaydedildi!" });
        } catch (error) {
            setMessage({ type: 'error', text: "Kaydetme sırasında bir hata oluştu!" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {/* TOAST MESAJI */}
            {message && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                    padding: '15px 25px', borderRadius: '8px', color: 'white',
                    fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444',
                    animation: 'fadeIn 0.3s ease-in-out'
                }}>
                    {message.type === 'success' ? '✅' : '⚠️'} {message.text}
                </div>
            )}

            <div className="page-header">
                <div className="page-title">
                    <h2>Fiyat Listesi Oluştur</h2>
                </div>
                {/* GENEL KAYDET BUTONU */}
                <button
                    onClick={handleSaveAll}
                    disabled={!hasChanges || saving}
                    className={`btn ${hasChanges ? 'btn-success' : 'btn-secondary'}`}
                    style={{ padding: '10px 30px', fontSize: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                >
                    {saving ? 'Kaydediliyor...' : (hasChanges ? '💾 Değişiklikleri Kaydet' : 'Değişiklik Yok')}
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {groups.map(group => {
                    const isGroupOpen = openGroupIds.includes(group.id!);
                    const groupCats = categories.filter(c => c.groupId === group.id);

                    return (
                        <div key={group.id} className="card" style={{ padding: 0, overflow: 'hidden', border: isGroupOpen ? '2px solid #3498db' : '1px solid #ddd' }}>

                            {/* GRUP BAŞLIĞI */}
                            <div
                                onClick={() => toggleGroup(group.id!)}
                                style={{
                                    padding: '15px 20px', backgroundColor: isGroupOpen ? '#f1f8ff' : '#f9f9f9',
                                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    fontWeight: 'bold', fontSize: '16px', color: '#2c3e50'
                                }}
                            >
                                <span>📁 {group.groupName}</span>
                                <span>{isGroupOpen ? '▲' : '▼'}</span>
                            </div>

                            {/* GRUP İÇERİĞİ */}
                            {isGroupOpen && (
                                <div style={{ padding: '10px 20px 20px 20px', backgroundColor: '#fff' }}>
                                    {groupCats.map(cat => {
                                        const isCatOpen = openCategoryIds.includes(cat.id!);

                                        // 🔥 ÜRÜNLERİ FİLTRELE VE A'DAN Z'YE SIRALA
                                        const catProducts = products
                                            .filter(p => p.categoryId === cat.id)
                                            .sort((a, b) => a.productName.localeCompare(b.productName)); // A-Z Sıralama

                                        if (catProducts.length === 0) return null;

                                        return (
                                            <div key={cat.id} style={{ marginTop: '10px', border: '1px solid #eee', borderRadius: '5px' }}>

                                                {/* KATEGORİ BAŞLIĞI */}
                                                <div
                                                    onClick={() => toggleCategory(cat.id!)}
                                                    style={{
                                                        padding: '10px 15px', backgroundColor: '#fff', borderBottom: isCatOpen ? '1px solid #eee' : 'none',
                                                        cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        fontWeight: '600', color: '#e67e22', fontSize: '14px'
                                                    }}
                                                >
                                                    <span>📂 {cat.categoryName}</span>
                                                    <span style={{ fontSize: '12px', color: '#999' }}>{isCatOpen ? 'Kapat' : 'Aç'}</span>
                                                </div>

                                                {/* ÜRÜN LİSTESİ */}
                                                {isCatOpen && (
                                                    <div style={{ padding: '10px' }}>
                                                        <table className="data-table dense">
                                                            <thead>
                                                                <tr style={{ backgroundColor: '#f8f9fa' }}>
                                                                    <th style={{ width: '40%' }}>Ürün Adı</th>
                                                                    <th style={{ width: '30%' }}>Standart Fiyat</th>
                                                                    <th style={{ width: '30%', textAlign: 'center' }}>Ebatlar</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {catProducts.map(p => {
                                                                    const stdKey = `${p.id}_std`;
                                                                    const showDetails = openProductDetails.includes(p.id!);

                                                                    return (
                                                                        <>
                                                                            <tr key={p.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                                                                                <td style={{ fontWeight: '500' }}>{p.productName}</td>

                                                                                {/* STANDART FİYAT GİRİŞİ */}
                                                                                <td>
                                                                                    <input
                                                                                        type="number"
                                                                                        placeholder="0"
                                                                                        value={priceMap[stdKey] || ''}
                                                                                        onChange={e => handlePriceChange(p.id!, null, e.target.value)}
                                                                                        className="form-input input-sm"
                                                                                        style={{ width: '100px', fontWeight: 'bold', textAlign: 'right' }}
                                                                                    /> ₺
                                                                                </td>

                                                                                {/* EBAT DETAY AÇMA BUTONU */}
                                                                                <td style={{ textAlign: 'center' }}>
                                                                                    <button
                                                                                        onClick={() => toggleProductDetails(p.id!)}
                                                                                        style={{
                                                                                            border: '1px solid #ddd', background: showDetails ? '#eee' : 'white',
                                                                                            padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px'
                                                                                        }}
                                                                                    >
                                                                                        {showDetails ? 'Gizle' : '+ Ebat Fiyatları'}
                                                                                    </button>
                                                                                </td>
                                                                            </tr>

                                                                            {/* EBAT DETAYLARI (GİZLİ SATIR) */}
                                                                            {showDetails && (
                                                                                <tr style={{ backgroundColor: '#fcfcfc' }}>
                                                                                    <td colSpan={3} style={{ padding: '10px 10px 10px 50px' }}>
                                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                                                                            {dimensions.map(dim => {
                                                                                                const dimKey = `${p.id}_${dim.id}`;
                                                                                                return (
                                                                                                    <div key={dim.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eee', padding: '5px', borderRadius: '4px', background: 'white' }}>
                                                                                                        <span style={{ fontSize: '11px', color: '#555' }}>{dim.dimensionName}</span>
                                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                                                            <input
                                                                                                                type="number"
                                                                                                                value={priceMap[dimKey] || ''}
                                                                                                                onChange={e => handlePriceChange(p.id!, dim.id!, e.target.value)}
                                                                                                                style={{ width: '70px', padding: '2px', fontSize: '11px', border: '1px solid #ccc', textAlign: 'right' }}
                                                                                                            />
                                                                                                            <span style={{ fontSize: '10px' }}>₺</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </>
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