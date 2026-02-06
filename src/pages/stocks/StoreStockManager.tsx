// src/pages/stocks/StoreStockManager.tsx
import { useEffect, useState } from "react";
import { getStores } from "../../services/storeService";
import { getStoreStocks, manualAddOrUpdateStock } from "../../services/storeStockService";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

// Tanımlar ve Servisler
import { getProducts } from "../../services/productService";
import { getAllPrices } from "../../services/priceService";
import { getCategories, getColors, getDimensions, getGroups } from "../../services/definitionService";

import type { Store, Product, Category, Color, Dimension, StoreStock, SystemUser, Group } from "../../types";
import "../../App.css";

import StoreIcon from "../../assets/icons/store.svg";
import EditIcon from "../../assets/icons/edit.svg";
import PlusIcon from "../../assets/icons/plus.svg";

// İKONLAR
const Icons = {
    search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    filter: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
    sort: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
};

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

    // Fiyat Haritası
    const [priceMap, setPriceMap] = useState<Record<string, number>>({});

    const [stocks, setStocks] = useState<StoreStock[]>([]);
    const [loading, setLoading] = useState(true);

    // --- MODAL STATE ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

    // FİLTRELEME & SIRALAMA STATE'LERİ
    const [selectedGroupId, setSelectedGroupId] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState<'name_asc' | 'free_desc' | 'incoming_desc'>('name_asc');

    // Modal Form State
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
                const [s, p, c, col, dim, grp, prices] = await Promise.all([
                    getStores(), getProducts(), getCategories(), getColors(), getDimensions(), getGroups(), getAllPrices()
                ]);

                setStores(s); setProducts(p); setCategories(c); setColors(col); setDimensions(dim); setGroups(grp);

                const pMap: Record<string, number> = {};
                prices.forEach(pr => {
                    const key = pr.dimensionId ? `${pr.productId}_${pr.dimensionId}` : `${pr.productId}_std`;
                    pMap[key] = pr.amount;
                });
                setPriceMap(pMap);

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

    const refreshStocks = () => {
        if (!selectedStoreId) { setStocks([]); return; }
        setLoading(true);
        getStoreStocks(selectedStoreId).then(data => {
            setStocks(data);
            setLoading(false);
        });
    };

    useEffect(() => { refreshStocks(); }, [selectedStoreId]);

    // --- FİLTRELEME VE SIRALAMA MANTIĞI ---
    const getFilteredStocks = () => {
        let filtered = stocks;

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(s => s.productName.toLowerCase().includes(lower));
        }

        if (selectedGroupId) {
            const catIdsInGroup = categories.filter(c => c.groupId === selectedGroupId).map(c => c.id);
            const productIdsInGroup = products.filter(p => catIdsInGroup.includes(p.categoryId)).map(p => p.id);
            filtered = filtered.filter(s => productIdsInGroup.includes(s.productId));
        }

        if (selectedCategoryId) {
            const productIdsInCat = products.filter(p => p.categoryId === selectedCategoryId).map(p => p.id);
            filtered = filtered.filter(s => productIdsInCat.includes(s.productId));
        }

        if (sortOrder === 'name_asc') {
            filtered.sort((a, b) => a.productName.localeCompare(b.productName));
        } else if (sortOrder === 'free_desc') {
            filtered.sort((a, b) => (b.freeStock || 0) - (a.freeStock || 0));
        } else if (sortOrder === 'incoming_desc') {
            filtered.sort((a, b) => ((b.incomingStock || 0) + (b.incomingReservedStock || 0)) - ((a.incomingStock || 0) + (a.incomingReservedStock || 0)));
        }

        return filtered;
    };

    const displayStocks = getFilteredStocks();

    // --- MODAL İŞLEMLERİ ---
    const handleAddNewClick = () => {
        setModalMode('add');
        setSelectedGroupId(""); // Filtreleri modal için sıfırla
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

    const getProductPrice = (prodId: string, dimId?: string | null) => {
        const key = dimId ? `${prodId}_${dimId}` : `${prodId}_std`;
        const price = priceMap[key];

        if (!price && dimId) {
            const stdPrice = priceMap[`${prodId}_std`];
            return stdPrice ? `${stdPrice.toLocaleString('tr-TR')} ₺` : "-";
        }
        return price ? `${price.toLocaleString('tr-TR')} ₺` : "-";
    };

    const renderVal = (val: number) => val === 0 ? "" : val;

    // Modal içi dinamik filtreli ürün listesi
    const filteredModalProducts = selectedCategoryId
        ? products.filter(p => p.categoryId === selectedCategoryId)
        : products;

    const filteredModalCategories = selectedGroupId
        ? categories.filter(c => c.groupId === selectedGroupId)
        : categories;

    if (loading && !stocks.length && !selectedStoreId) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title">
                    <h2>Mağaza Stok Yönetimi</h2>
                    <p>Fiziksel ve beklenen stokların kontrolü</p>
                </div>
            </div>

            {/* --- KONTROL ÇUBUĞU (Filtreler ve Sıralama) --- */}
            <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>

                    {/* MAĞAZA SEÇİMİ */}
                    <div>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '12px', color: '#64748b' }}>MAĞAZA</label>
                        {isAdmin ? (
                            <div style={{ position: 'relative' }}>
                                <img src={StoreIcon} width="16" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                <select className="form-input" style={{ width: '100%', paddingLeft: '35px' }} value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)}>
                                    <option value="">-- Seçiniz --</option>
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div style={{ fontWeight: 'bold', color: '#2980b9', padding: '10px 15px', backgroundColor: '#ecf0f1', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                {stores.find(s => s.id === selectedStoreId)?.storeName || "Mağazam"}
                            </div>
                        )}
                    </div>

                    {/* GRUP FİLTRESİ */}
                    <div>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '12px', color: '#64748b' }}>ÜRÜN GRUBU</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>{Icons.filter}</span>
                            <select className="form-input" style={{ width: '100%', paddingLeft: '35px' }} value={selectedGroupId} onChange={e => { setSelectedGroupId(e.target.value); setSelectedCategoryId(""); }}>
                                <option value="">Tümü</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* KATEGORİ FİLTRESİ */}
                    <div>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '12px', color: '#64748b' }}>KATEGORİ</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>{Icons.filter}</span>
                            <select className="form-input" style={{ width: '100%', paddingLeft: '35px' }} value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)} disabled={!selectedGroupId}>
                                <option value="">Tümü</option>
                                {categories.filter(c => c.groupId === selectedGroupId).map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* ARAMA */}
                    <div>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '12px', color: '#64748b' }}>ÜRÜN ARA</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>{Icons.search}</span>
                            <input type="text" className="form-input" style={{ width: '100%', paddingLeft: '35px' }} placeholder="Ürün adı..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    {/* SIRALAMA */}
                    <div>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '12px', color: '#64748b' }}>SIRALAMA</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>{Icons.sort}</span>
                            <select className="form-input" style={{ width: '100%', paddingLeft: '35px' }} value={sortOrder} onChange={(e: any) => setSortOrder(e.target.value)}>
                                <option value="name_asc">İsim (A-Z)</option>
                                <option value="free_desc">Serbest Stok (Çoktan Aza)</option>
                                <option value="incoming_desc">Gelecek Stok (Çoktan Aza)</option>
                            </select>
                        </div>
                    </div>

                    {/* YENİ EKLE BUTONU */}
                    {isAdmin && selectedStoreId && (
                        <div>
                            <button onClick={handleAddNewClick} className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', height: '42px' }}>
                                <img src={PlusIcon} style={{ width: 16, filter: 'invert(1)' }} /> Yeni Ekle
                            </button>
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
                                    <th style={{ width: '25%' }}>Ürün Bilgisi</th>
                                    <th style={{ width: '15%' }}>Renk</th>
                                    {/* 🔥 DÜZELTME: Sağdan boşluk eklendi */}
                                    <th style={{ width: '10%', textAlign: 'right', paddingRight: '20px' }}>Fiyat</th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#d4edda', color: '#155724' }}>Serbest</th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#fff3cd', color: '#856404' }}>Rezerve</th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#d1ecf1', color: '#0c5460' }}>Gelecek(Depo)</th>
                                    <th style={{ textAlign: 'center', backgroundColor: '#f8d7da', color: '#721c24' }}>Gelecek(Müş)</th>
                                    {isAdmin && <th style={{ textAlign: 'center', width: '60px' }}>İşlem</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {displayStocks.length > 0 ? (
                                    displayStocks.map(stock => (
                                        <tr key={stock.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
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

                                            {/* 🔥 DÜZELTME: Sağdan boşluk eklendi */}
                                            <td style={{ textAlign: 'right', fontWeight: '600', color: '#1e293b', fontSize: '13px', paddingRight: '20px' }}>
                                                {getProductPrice(stock.productId, stock.dimensionId)}
                                            </td>

                                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#27ae60', backgroundColor: '#f0fff4', padding: '8px', fontSize: '14px' }}>{renderVal(stock.freeStock)}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#f39c12', backgroundColor: '#fffcf5', padding: '8px', fontSize: '14px' }}>{renderVal(stock.reservedStock)}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#3498db', backgroundColor: '#f0f9ff', padding: '8px', fontSize: '14px' }}>{renderVal(stock.incomingStock)}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#e74c3c', backgroundColor: '#fff5f5', padding: '8px', fontSize: '14px' }}>{renderVal(stock.incomingReservedStock)}</td>

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
                                    <tr><td colSpan={isAdmin ? 8 : 7} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>Stok bulunamadı.</td></tr>
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

                            {modalMode === 'add' && (
                                <>
                                    <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '6px', marginBottom: '15px', fontSize: '13px', color: '#856404' }}>
                                        ⚠️ Dikkat: Manuel ekleme sadece acil durumlar içindir. Normalde "Alış İşlemleri" sayfasını kullanmalısınız.
                                    </div>
                                    <div className="form-group">
                                        <label>Ürün Grubu</label>
                                        <select
                                            className="form-input"
                                            value={selectedGroupId}
                                            onChange={e => { setSelectedGroupId(e.target.value); setSelectedCategoryId(""); setFormData({ ...formData, productId: "" }); }}
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
                                            onChange={e => { setSelectedCategoryId(e.target.value); setFormData({ ...formData, productId: "" }); }}
                                            disabled={!selectedGroupId}
                                        >
                                            <option value="">-- Kategori Seçiniz --</option>
                                            {filteredModalCategories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <label>Ürün</label>
                                <select
                                    className="form-input"
                                    value={formData.productId}
                                    onChange={e => setFormData({ ...formData, productId: e.target.value })}
                                    disabled={modalMode === 'edit'}
                                    style={{ backgroundColor: modalMode === 'edit' ? '#f3f4f6' : 'white' }}
                                >
                                    <option value="">-- Ürün Seçiniz --</option>
                                    {(modalMode === 'add' ? filteredModalProducts : products).map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                                </select>
                            </div>

                            <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
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
                                <div style={{ flex: 1 }}>
                                    <label>Ebat</label>
                                    <select
                                        className="form-input"
                                        value={formData.dimensionId}
                                        onChange={e => setFormData({ ...formData, dimensionId: e.target.value })}
                                        disabled={modalMode === 'edit'}
                                        style={{ backgroundColor: modalMode === 'edit' ? '#f3f4f6' : 'white' }}
                                    >
                                        <option value="">Yok / Standart</option>
                                        {dimensions.map(d => <option key={d.id} value={d.id}>{d.dimensionName}</option>)}
                                    </select>
                                </div>
                            </div>

                            <hr style={{ margin: '15px 0', border: 0, borderTop: '1px solid #eee' }} />

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

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary">İptal</button>
                                <button onClick={handleSave} className="btn btn-primary">Kaydet</button>
                            </div>
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