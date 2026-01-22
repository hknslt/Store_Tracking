    // src/pages/stocks/StoreStockManager.tsx
    import { useEffect, useState } from "react";
    import { getStores } from "../../services/storeService";
    import { getStoreStocks, manualAddOrUpdateStock } from "../../services/storeStockService";
    import { useAuth } from "../../context/AuthContext";
    import { db } from "../../firebase";
    import { doc, getDoc } from "firebase/firestore";

    // Tanımlar
    import { getProducts } from "../../services/productService";
    import { getCategories, getColors, getDimensions, getGroups } from "../../services/definitionService";

    import type { Store, Product, Category, Color, Dimension, StoreStock, SystemUser, Group } from "../../types";
    import "../../App.css";

    import StoreIcon from "../../assets/icons/store.svg";
    import EditIcon from "../../assets/icons/edit.svg";
    import PlusIcon from "../../assets/icons/plus.svg";

    const StoreStockManager = () => {
        const { currentUser } = useAuth();

        const [stores, setStores] = useState<Store[]>([]);
        const [selectedStoreId, setSelectedStoreId] = useState("");
        const [isAdmin, setIsAdmin] = useState(false);

        // Tanımlar
        const [groups, setGroups] = useState<Group[]>([]);
        const [products, setProducts] = useState<Product[]>([]);
        const [categories, setCategories] = useState<Category[]>([]);
        const [colors, setColors] = useState<Color[]>([]);
        const [dimensions, setDimensions] = useState<Dimension[]>([]);

        const [stocks, setStocks] = useState<StoreStock[]>([]);
        const [loading, setLoading] = useState(true);

        // --- MODAL STATE ---
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

        // Filtreleme State'leri
        const [selectedGroupId, setSelectedGroupId] = useState("");
        const [selectedCategoryId, setSelectedCategoryId] = useState("");

        const [formData, setFormData] = useState({
            productId: "",
            colorId: "",
            dimensionId: "",
            freeStock: 0,
            reservedStock: 0,
            incomingStock: 0,
            incomingReservedStock: 0
        });

        const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

        useEffect(() => {
            if (message) {
                const timer = setTimeout(() => setMessage(null), 3000);
                return () => clearTimeout(timer);
            }
        }, [message]);

        // --- BAŞLANGIÇ ---
        useEffect(() => {
            const loadBase = async () => {
                if (!currentUser) return;
                try {
                    const [s, p, c, col, dim, grp] = await Promise.all([
                        getStores(), getProducts(), getCategories(), getColors(), getDimensions(), getGroups()
                    ]);
                    setStores(s); setProducts(p); setCategories(c); setColors(col); setDimensions(dim); setGroups(grp);

                    const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                    if (userDoc.exists()) {
                        const u = userDoc.data() as SystemUser;
                        if (['admin', 'control', 'report'].includes(u.role)) {
                            setIsAdmin(true);
                        } else {
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
        const refreshStocks = () => {
            if (!selectedStoreId) { setStocks([]); return; }
            setLoading(true);
            getStoreStocks(selectedStoreId).then(data => {
                setStocks(data);
                setLoading(false);
            });
        };

        useEffect(() => {
            refreshStocks();
        }, [selectedStoreId]);

        // --- MODAL İŞLEMLERİ ---
        const handleAddNewClick = () => {
            setModalMode('add');
            setSelectedGroupId("");
            setSelectedCategoryId("");
            setFormData({
                productId: "", colorId: "", dimensionId: "",
                freeStock: 0, reservedStock: 0, incomingStock: 0, incomingReservedStock: 0
            });
            setIsModalOpen(true);
        };

        const handleEditClick = (stock: StoreStock) => {
            setModalMode('edit');
            setFormData({
                productId: stock.productId,
                colorId: stock.colorId,
                dimensionId: stock.dimensionId || "",
                freeStock: stock.freeStock || 0,
                reservedStock: stock.reservedStock || 0,
                incomingStock: stock.incomingStock || 0,
                incomingReservedStock: stock.incomingReservedStock || 0
            });
            setIsModalOpen(true);
        };

        const handleSave = async () => {
            if (!selectedStoreId) {
                setMessage({ type: 'error', text: "Mağaza seçili değil!" });
                return;
            }
            if (!formData.productId || !formData.colorId) {
                setMessage({ type: 'error', text: "Ürün ve Renk seçimi zorunludur!" });
                return;
            }

            try {
                const product = products.find(p => p.id === formData.productId);
                if (!product) return;

                await manualAddOrUpdateStock(selectedStoreId, {
                    productId: formData.productId,
                    productName: product.productName,
                    colorId: formData.colorId,
                    dimensionId: formData.dimensionId || null,
                    freeStock: Number(formData.freeStock),
                    reservedStock: Number(formData.reservedStock),
                    incomingStock: Number(formData.incomingStock),
                    incomingReservedStock: Number(formData.incomingReservedStock)
                });

                setIsModalOpen(false);
                refreshStocks();
                setMessage({ type: 'success', text: "Stok başarıyla güncellendi." });
            } catch (error) {
                setMessage({ type: 'error', text: "Kaydedilirken bir hata oluştu." });
            }
        };

        // --- YARDIMCILAR ---
        const getCatName = (prodId: string) => {
            const p = products.find(x => x.id === prodId);
            return p ? categories.find(c => c.id === p.categoryId)?.categoryName : "-";
        };
        const getColorName = (id: string) => colors.find(x => x.id === id)?.colorName || "-";
        const getDimName = (id?: string | null) => id ? dimensions.find(x => x.id === id)?.dimensionName : "";

        // 🔥 DEĞİŞİKLİK: 0 ise boş string (""), değilse değeri göster
        const renderVal = (val: number) => val === 0 ? "" : val;

        // --- FİLTRELENMİŞ LİSTELER ---
        const filteredCategories = selectedGroupId
            ? categories.filter(c => c.groupId === selectedGroupId)
            : [];

        const filteredProducts = selectedCategoryId
            ? products.filter(p => p.categoryId === selectedCategoryId)
            : [];

        if (loading && !stocks.length && !selectedStoreId) return <div className="page-container">Yükleniyor...</div>;

        return (
            <div className="page-container">
                <div className="page-header">
                    <div className="page-title">
                        <h2>Mağaza Stok Yönetimi</h2>
                        <p>Fiziksel ve beklenen stokların kontrolü</p>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-body" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                        {/* MAĞAZA SEÇİMİ */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <label style={{ fontWeight: 'bold' }}>Mağaza:</label>
                            {isAdmin ? (
                                <select className="form-input" style={{ width: '300px' }} value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)}>
                                    <option value="">-- Seçiniz --</option>
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                                </select>
                            ) : (
                                <div style={{ fontWeight: 'bold', color: '#2980b9', padding: '10px', backgroundColor: '#ecf0f1', borderRadius: '5px' }}>
                                    {stores.find(s => s.id === selectedStoreId)?.storeName || "Mağazam"}
                                </div>
                            )}
                        </div>

                        {/* YENİ STOK BUTONU */}
                        {isAdmin && selectedStoreId && (
                            <button onClick={handleAddNewClick} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <img src={PlusIcon} style={{ width: 16, filter: 'invert(1)' }} /> Yeni Ürün/Stok Ekle
                            </button>
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
                                        <th style={{ textAlign: 'center', backgroundColor: '#d4edda', color: '#155724' }}>Serbest</th>
                                        <th style={{ textAlign: 'center', backgroundColor: '#fff3cd', color: '#856404' }}>Rezerve</th>
                                        <th style={{ textAlign: 'center', backgroundColor: '#d1ecf1', color: '#0c5460' }}>Gelecek(Depo)</th>
                                        <th style={{ textAlign: 'center', backgroundColor: '#f8d7da', color: '#721c24' }}>Gelecek(Müş)</th>
                                        {isAdmin && <th style={{ textAlign: 'center', width: '60px' }}>İşlem</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {stocks.length > 0 ? (
                                        stocks.map(stock => (
                                            <tr key={stock.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                                {/* 🔥 DEĞİŞİKLİK: Padding '8px' yapılarak satırlar daraltıldı */}
                                                <td style={{ padding: '8px 12px' }}>
                                                    <div>
                                                        <span style={{ fontWeight: '600', color: '#34495e', marginRight: '6px', fontSize: '13px' }}>
                                                            {stock.productName.split('-')[0].trim()}
                                                        </span>
                                                        {stock.dimensionId && (
                                                            <span style={{ color: '#e67e22', fontWeight: '600', marginRight: '6px', fontSize: '13px' }}>
                                                                {getDimName(stock.dimensionId)}
                                                            </span>
                                                        )}
                                                        <span style={{ color: '#7f8c8d', fontSize: '12px' }}>
                                                            ({getCatName(stock.productId)})
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ color: '#555', padding: '8px 12px', fontSize: '13px' }}>{getColorName(stock.colorId)}</td>

                                                {/* Rakam Hücreleri: Padding küçültüldü, Font 14px yapıldı */}
                                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#27ae60', backgroundColor: '#f0fff4', padding: '8px', fontSize: '14px' }}>{renderVal(stock.freeStock)}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#f39c12', backgroundColor: '#fffcf5', padding: '8px', fontSize: '14px' }}>{renderVal(stock.reservedStock)}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#3498db', backgroundColor: '#f0f9ff', padding: '8px', fontSize: '14px' }}>{renderVal(stock.incomingStock)}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#e74c3c', backgroundColor: '#fff5f5', padding: '8px', fontSize: '14px' }}>{renderVal(stock.incomingReservedStock)}</td>

                                                {/* DÜZENLE BUTONU */}
                                                {isAdmin && (
                                                    <td style={{ textAlign: 'center', padding: '8px' }}>
                                                        <button
                                                            onClick={() => handleEditClick(stock)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                                                            title="Stoğu Düzenle"
                                                        >
                                                            <img src={EditIcon} style={{ width: 16, opacity: 0.6 }} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={isAdmin ? 7 : 6} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>Stok bulunamadı.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                                <div style={{ fontSize: '40px', marginBottom: '10px' }}><img src={StoreIcon} alt="" style={{ width: '40px', opacity: 0.6 }} /></div>
                                Lütfen mağaza seçiniz.
                            </div>
                        )}
                    </div>
                </div>

                {/* --- MODAL --- */}
                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ width: '500px' }}>
                            <div className="modal-header">
                                <h3>{modalMode === 'add' ? 'Yeni Stok Ekle' : 'Stoğu Düzenle'}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="close-btn">×</button>
                            </div>
                            <div className="modal-body">

                                {/* EKLEME MODU */}
                                {modalMode === 'add' && (
                                    <>
                                        <div className="form-group">
                                            <label>Ürün Grubu</label>
                                            <select
                                                className="form-input"
                                                value={selectedGroupId}
                                                onChange={e => {
                                                    setSelectedGroupId(e.target.value);
                                                    setSelectedCategoryId("");
                                                    setFormData({ ...formData, productId: "" });
                                                }}
                                            >
                                                <option value="">-- Grup Seçiniz --</option>
                                                {groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Kategori</label>
                                            <select
                                                className="form-input"
                                                value={selectedCategoryId}
                                                onChange={e => {
                                                    setSelectedCategoryId(e.target.value);
                                                    setFormData({ ...formData, productId: "" });
                                                }}
                                                disabled={!selectedGroupId}
                                            >
                                                <option value="">-- Kategori Seçiniz --</option>
                                                {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}

                                {/* ÜRÜN SEÇİMİ */}
                                <div className="form-group">
                                    <label>Ürün</label>
                                    <select
                                        className="form-input"
                                        value={formData.productId}
                                        onChange={e => setFormData({ ...formData, productId: e.target.value })}
                                        disabled={modalMode === 'edit' || (modalMode === 'add' && !selectedCategoryId)}
                                        style={{ backgroundColor: (modalMode === 'edit' || (modalMode === 'add' && !selectedCategoryId)) ? '#f3f4f6' : 'white' }}
                                    >
                                        <option value="">
                                            {modalMode === 'add' && !selectedCategoryId ? "Önce Kategori Seçiniz" : "-- Ürün Seçiniz --"}
                                        </option>
                                        {(modalMode === 'add' ? filteredProducts : products).map(p => (
                                            <option key={p.id} value={p.id}>{p.productName}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* RENK & EBAT */}
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Renk</label>
                                        <select
                                            className="form-input"
                                            value={formData.colorId}
                                            onChange={e => setFormData({ ...formData, colorId: e.target.value })}
                                            disabled={modalMode === 'edit'}
                                            style={{ backgroundColor: modalMode === 'edit' ? '#f3f4f6' : 'white' }}
                                        >
                                            <option value="">Seçiniz</option>
                                            {colors.map(c => <option key={c.id} value={c.id}>{c.colorName}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Ebat <span style={{ fontSize: '12px', color: '#999' }}>(Opsiyonel)</span></label>
                                        <select
                                            className="form-input"
                                            value={formData.dimensionId}
                                            onChange={e => setFormData({ ...formData, dimensionId: e.target.value })}
                                            disabled={modalMode === 'edit'}
                                            style={{ backgroundColor: modalMode === 'edit' ? '#f3f4f6' : 'white' }}
                                        >
                                            <option value="">Standart / Yok</option>
                                            {dimensions.map(d => <option key={d.id} value={d.id}>{d.dimensionName}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <hr style={{ margin: '15px 0', border: '0', borderTop: '1px solid #eee' }} />
                                <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#666' }}>Adetler (Manuel Düzenleme)</h4>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group">
                                        <label style={{ color: '#155724' }}>Serbest Stok</label>
                                        <input type="number" className="form-input" value={formData.freeStock} onChange={e => setFormData({ ...formData, freeStock: Number(e.target.value) })} />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ color: '#856404' }}>Rezerve Stok</label>
                                        <input type="number" className="form-input" value={formData.reservedStock} onChange={e => setFormData({ ...formData, reservedStock: Number(e.target.value) })} />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ color: '#0c5460' }}>Gelecek (Depo)</label>
                                        <input type="number" className="form-input" value={formData.incomingStock} onChange={e => setFormData({ ...formData, incomingStock: Number(e.target.value) })} />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ color: '#721c24' }}>Gelecek (Müşteri)</label>
                                        <input type="number" className="form-input" value={formData.incomingReservedStock} onChange={e => setFormData({ ...formData, incomingReservedStock: Number(e.target.value) })} />
                                    </div>
                                </div>

                            </div>
                            <div className="modal-footer">
                                <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary">İptal</button>
                                <button onClick={handleSave} className="btn btn-primary">Kaydet</button>
                            </div>
                        </div>
                    </div>
                )}


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
            </div>
        );
    };

    export default StoreStockManager;