// src/pages/sales/SaleAdd.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { addSale } from "../../services/saleService";
import { getStores, getPersonnelByStore } from "../../services/storeService";
import { getStoreStocks } from "../../services/storeStockService";
import {
    getGroups,
    getCategoriesByGroupId,
    getCushions,
    getColors,
    getDimensions
} from "../../services/definitionService";
import { getProductsByCategoryId } from "../../services/productService";

// 👇 ŞEHİR VERİSİNİ IMPORT ETTİK
import { iller } from "../../constants/cities";

import type { Sale, SaleItem, Store, SystemUser, Personnel, Group, Category, Product, Cushion, Color, Dimension, StoreStock } from "../../types";
import "../../App.css";

const SaleAdd = () => {
    const { currentUser } = useAuth();

    // Listeler
    const [stores, setStores] = useState<Store[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [productsInCat, setProductsInCat] = useState<Product[]>([]);
    const [allColors, setAllColors] = useState<Color[]>([]);
    const [allDimensions, setAllDimensions] = useState<Dimension[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);

    const [storeStocks, setStoreStocks] = useState<StoreStock[]>([]);
    const [storePersonnel, setStorePersonnel] = useState<(Personnel | SystemUser)[]>([]);

    // 👇 İLÇE LİSTESİ STATE
    const [districts, setDistricts] = useState<string[]>([]);

    const [currentUserData, setCurrentUserData] = useState<SystemUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // Header
    const [headerData, setHeaderData] = useState({
        date: new Date().toISOString().split('T')[0],
        receiptNo: "",
        storeId: "",
        personnelId: "",
        personnelName: "",
        customerName: "",
        phone: "",
        city: "",        // İl
        district: "",    // İlçe
        address: "",
        customerNote: "",
        shippingCost: 0
    });

    const [selectedProductId, setSelectedProductId] = useState("");
    const [selectedColorId, setSelectedColorId] = useState("");
    const [selectedDimensionId, setSelectedDimensionId] = useState("");

    const [lineItem, setLineItem] = useState<Partial<SaleItem>>({
        groupId: "", categoryId: "", productId: "", productName: "", cushionId: "",
        productNote: "",
        quantity: 1, price: 0, discount: 0,
        supplyMethod: 'Stoktan',
        deliveryStatus: 'Bekliyor',
        status: 'Sipariş'
    });

    const [addedItems, setAddedItems] = useState<SaleItem[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);

    // Stok Kontrolü
    const getCurrentStockQuantity = () => {
        if (!selectedProductId || !selectedColorId) return 0;
        const targetId = `${selectedProductId}_${selectedColorId}_${selectedDimensionId || 'null'}`;
        const stock = storeStocks.find(s => s.id === targetId);
        return stock ? stock.freeStock : 0;
    };

    const currentFreeStock = getCurrentStockQuantity();
    const requestedQty = lineItem.quantity || 0;

    const getStockStatusColor = () => {
        if (currentFreeStock === 0) return '#fff5f5';
        if (currentFreeStock < requestedQty) return '#fffbf0';
        return '#f0fff4';
    };

    // Veri Yükleme
    useEffect(() => {
        const initData = async () => {
            const [g, c, col, dim] = await Promise.all([
                getGroups(), getCushions(), getColors(), getDimensions()
            ]);
            setGroups(g); setCushions(c); setAllColors(col); setAllDimensions(dim);

            if (currentUser) {
                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    const u = userDoc.data() as SystemUser;
                    setCurrentUserData(u);

                    if (u.role === 'admin' || u.role === 'control') {
                        setIsAdmin(true);
                        getStores().then(setStores);
                    } else {
                        setIsAdmin(false);
                        if (u.storeId) setHeaderData(p => ({ ...p, storeId: u.storeId! }));
                    }
                }
            }
        };
        initData();
    }, [currentUser]);

    useEffect(() => {
        if (headerData.storeId) {
            getStoreStocks(headerData.storeId).then(setStoreStocks);
            getPersonnelByStore(headerData.storeId).then(data => {
                const sorted = data.sort((a, b) => a.fullName.localeCompare(b.fullName));
                setStorePersonnel(sorted as (Personnel | SystemUser)[]);
            });
        } else {
            setStorePersonnel([]);
            setStoreStocks([]);
        }
    }, [headerData.storeId]);

    // HEADER CHANGE (İL/İLÇE VE PERSONEL MANTIĞI DAHİL)
    const handleHeaderChange = (e: any) => {
        const { name, value } = e.target;

        if (name === 'personnelId') {
            const p = storePersonnel.find(per => per.id === value);
            setHeaderData(prev => ({
                ...prev,
                personnelId: value,
                personnelName: p ? p.fullName : ""
            }));
        }
        // 👇 İL DEĞİŞİNCE İLÇELERİ GÜNCELLE VE İLÇEYİ SIFIRLA
        else if (name === 'city') {
            const selectedCity = iller.find(i => i.isim === value);
            setDistricts(selectedCity ? selectedCity.ilceler : []);
            setHeaderData(prev => ({ ...prev, city: value, district: "" }));
        }
        else {
            setHeaderData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleLineChange = (e: any) => setLineItem({ ...lineItem, [e.target.name]: e.target.value });

    // Seçim Zinciri
    const handleGroupChange = async (groupId: string) => { setLineItem(prev => ({ ...prev, groupId, categoryId: "", productId: "" })); setSelectedProductId(""); if (groupId) setCategories(await getCategoriesByGroupId(groupId)); else setCategories([]); };
    const handleCategoryChange = async (categoryId: string) => { setLineItem(prev => ({ ...prev, categoryId, productId: "" })); setSelectedProductId(""); if (categoryId) setProductsInCat(await getProductsByCategoryId(categoryId)); else setProductsInCat([]); };
    const updateLineItem = (prodId: string, colId: string, dimId: string) => { const prod = productsInCat.find(p => p.id === prodId); const col = allColors.find(c => c.id === colId); const dim = allDimensions.find(d => d.id === dimId); if (prod) { let name = prod.productName; setLineItem(prev => ({ ...prev, productId: prodId, colorId: colId, dimensionId: dimId || null, productName: name })); } };
    const handleProductChange = (val: string) => { setSelectedProductId(val); updateLineItem(val, selectedColorId, selectedDimensionId); };
    const handleColorChange = (val: string) => { setSelectedColorId(val); updateLineItem(selectedProductId, val, selectedDimensionId); };
    const handleDimensionChange = (val: string) => { setSelectedDimensionId(val); updateLineItem(selectedProductId, selectedColorId, val); };
    useEffect(() => { if (selectedProductId && selectedColorId) { if (currentFreeStock <= 0) { setLineItem(prev => ({ ...prev, supplyMethod: 'Merkezden' })); } else { setLineItem(prev => ({ ...prev, supplyMethod: 'Stoktan' })); } } }, [selectedProductId, selectedColorId, selectedDimensionId, currentFreeStock]);

    const addLineItem = () => {
        if (!lineItem.productId || !selectedColorId || !lineItem.quantity || !lineItem.price) {
            setMessage({ type: 'error', text: 'Ürün, Renk, Adet ve Fiyat zorunludur.' }); return;
        }
        const total = (Number(lineItem.price) - Number(lineItem.discount || 0)) * Number(lineItem.quantity);
        setAddedItems([{ ...lineItem, total } as SaleItem, ...addedItems]);
        setLineItem(prev => ({ ...prev, cushionId: "", quantity: 1, price: 0, discount: 0, productNote: "", productId: "", productName: "", colorId: "", dimensionId: null }));
        setSelectedProductId(""); setSelectedColorId(""); setSelectedDimensionId("");
    };

    const saveSale = async () => {
        if (!headerData.storeId || !headerData.customerName) { setMessage({ type: 'error', text: 'Mağaza ve Müşteri bilgileri zorunludur.' }); return; }
        if (!headerData.personnelId) { setMessage({ type: 'error', text: 'Lütfen Satış Personeli seçiniz.' }); return; }
        if (addedItems.length === 0) { setMessage({ type: 'error', text: 'Ürün ekleyiniz.' }); return; }
        if (!headerData.receiptNo.trim()) {
            setMessage({ type: 'error', text: 'Lütfen Fiş No giriniz.' });
            return;
        }
        const grandTotal = addedItems.reduce((acc, item) => acc + item.total, 0) + Number(headerData.shippingCost);

        const saleData: Sale = {
            ...headerData,
            shippingCost: Number(headerData.shippingCost),
            personnelId: headerData.personnelId,
            personnelName: headerData.personnelName,
            items: addedItems,
            grandTotal,
            createdAt: new Date()
        };

        try {
            await addSale(saleData);
            setMessage({ type: 'success', text: 'Sipariş oluşturuldu!' });
            setAddedItems([]);
            setHeaderData(prev => ({
                ...prev,
                receiptNo: "",
                personnelId: "", personnelName: "",
                customerName: "", phone: "", city: "", district: "", address: "", customerNote: "", shippingCost: 0
            }));
            setDistricts([]); // İlçeleri de sıfırla
            getStoreStocks(headerData.storeId).then(setStoreStocks);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        }
    };

    // Stiller
    const cellStyle = { padding: '4px', verticalAlign: 'middle' };
    const smallInput = { width: '60px', padding: '4px', fontSize: '13px', height: '28px', textAlign: 'center' as const, borderRadius: '4px', border: '1px solid #ccc' };
    const mediumInput = { width: '80px', padding: '4px', fontSize: '13px', height: '28px', borderRadius: '4px', border: '1px solid #ccc' };
    const selectStyle = { width: '100%', padding: '4px', fontSize: '12px', height: '28px', borderRadius: '4px', border: '1px solid #ccc' };
    const filterSelectStyle = { width: '80px', padding: '4px', fontSize: '11px', height: '28px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fdfdfd' };

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

            <div className="page-header" style={{ marginBottom: '15px' }}>
                <div className="page-title"><h2>Yeni Sipariş / Satış</h2></div>
                {addedItems.length > 0 && (<button onClick={saveSale} className="btn btn-success" style={{ padding: '8px 15px', fontSize: '14px' }}>SİPARİŞİ TAMAMLA ({addedItems.reduce((acc, item) => acc + item.total, 0) + Number(headerData.shippingCost)} ₺)</button>)}
            </div>

            {/* MÜŞTERİ BİLGİLERİ */}
            <div className="card" style={{ marginBottom: '15px', padding: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>

                    <div><label className="form-label" style={{ marginBottom: '2px', fontSize: '12px' }}>Tarih</label><input type="date" name="date" value={headerData.date} onChange={handleHeaderChange} className="form-input" style={{ padding: '6px' }} /></div>

                    <div>
                        <label className="form-label" style={{ marginBottom: '2px', fontSize: '12px' }}>Mağaza</label>
                        {isAdmin ?
                            <select name="storeId" value={headerData.storeId} onChange={handleHeaderChange} className="form-input" style={{ padding: '6px' }}><option value="">Seçiniz...</option>{stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}</select>
                            : <input disabled value={currentUserData?.storeId ? "Mağazam" : "..."} className="form-input" style={{ backgroundColor: '#eee', padding: '6px' }} />
                        }
                    </div>

                    <div>
                        <label className="form-label" style={{ marginBottom: '2px', fontSize: '12px' }}>
                            Fiş No <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input name="receiptNo" value={headerData.receiptNo} onChange={handleHeaderChange} className="form-input" style={{ padding: '6px' }} />
                    </div>

                    <div>
                        <label className="form-label" style={{ marginBottom: '2px', fontSize: '12px' }}>Satış Personeli</label>
                        <select
                            name="personnelId"
                            value={headerData.personnelId}
                            onChange={handleHeaderChange}
                            className="form-input"
                            style={{ padding: '6px' }}
                            disabled={!headerData.storeId}
                        >
                            <option value="">-- Personel Seç --</option>
                            {storePersonnel.map(p => (
                                <option key={p.id} value={p.id}>{p.fullName} {p.role === 'store_admin' ? '(Müdür)' : ''}</option>
                            ))}
                        </select>
                    </div>

                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div><label className="form-label" style={{ marginBottom: '2px', fontSize: '12px' }}>Müşteri Adı</label><input name="customerName" value={headerData.customerName} onChange={handleHeaderChange} className="form-input" style={{ padding: '6px' }} /></div>
                    <div><label className="form-label" style={{ marginBottom: '2px', fontSize: '12px' }}>Telefon</label><input name="phone" value={headerData.phone} onChange={handleHeaderChange} className="form-input" style={{ padding: '6px' }} /></div>

                    {/* 👇 İL SEÇİMİ */}
                    <div>
                        <label className="form-label" style={{ marginBottom: '2px', fontSize: '12px' }}>İl</label>
                        <select name="city" value={headerData.city} onChange={handleHeaderChange} className="form-input" style={{ padding: '6px' }}>
                            <option value="">İl Seçiniz...</option>
                            {iller.map(il => (
                                <option key={il.id} value={il.isim}>{il.isim}</option>
                            ))}
                        </select>
                    </div>

                    {/* 👇 İLÇE SEÇİMİ */}
                    <div>
                        <label className="form-label" style={{ marginBottom: '2px', fontSize: '12px' }}>İlçe</label>
                        <select
                            name="district"
                            value={headerData.district}
                            onChange={handleHeaderChange}
                            className="form-input"
                            style={{ padding: '6px' }}
                            disabled={!headerData.city} // İl seçilmeden pasif
                        >
                            <option value="">İlçe Seçiniz...</option>
                            {districts.map((ilce, index) => (
                                <option key={index} value={ilce}>{ilce}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 1fr', gap: '10px' }}>
                    <div><label className="form-label" style={{ marginBottom: '2px', fontSize: '12px' }}>Açık Adres</label><textarea name="address" value={headerData.address} onChange={handleHeaderChange} className="form-input" rows={1} style={{ resize: 'vertical', height: '32px', padding: '6px' }} /></div>
                    <div><label className="form-label" style={{ marginBottom: '2px', fontSize: '12px' }}>Termin Notu</label><input name="customerNote" value={headerData.customerNote} onChange={handleHeaderChange} className="form-input" style={{ padding: '6px' }} placeholder="Örn: 15 gün sonra teslim" /></div>
                </div>
            </div>

            {/* ÜRÜN GİRİŞİ */}
            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                    <table className="data-table dense" style={{ minWidth: '1000px', fontSize: '12px' }}>
                        <thead style={{ backgroundColor: '#f1f2f6' }}>
                            <tr>
                                <th style={{ width: '35%', padding: '8px' }}>Ürün (Grup - Kat - Ad)</th>
                                <th style={{ width: '10%', padding: '8px' }}>Renk</th>
                                <th style={{ width: '10%', padding: '8px' }}>Ebat</th>
                                <th style={{ width: '8%', padding: '8px' }}>Minder</th>
                                <th style={{ width: '6%', padding: '8px' }}>Adet</th>
                                <th style={{ width: '8%', padding: '8px' }}>Fiyat</th>
                                <th style={{ width: '10%', padding: '8px' }}>Temin</th>
                                <th style={{ width: '8%', padding: '8px' }}>Stok</th>
                                <th style={{ width: '5%', padding: '8px' }}>+</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* --- GİRİŞ SATIRI 1 --- */}
                            <tr style={{ backgroundColor: getStockStatusColor(), borderTop: '2px solid #3498db' }}>
                                <td style={cellStyle}>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <select value={lineItem.groupId} onChange={e => handleGroupChange(e.target.value)} style={filterSelectStyle}>
                                            <option value="">Grup</option>{groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
                                        </select>
                                        <select value={lineItem.categoryId} onChange={e => handleCategoryChange(e.target.value)} style={filterSelectStyle} disabled={!lineItem.groupId}>
                                            <option value="">Kat</option>{categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                                        </select>
                                        <select value={selectedProductId} onChange={e => handleProductChange(e.target.value)} style={{ ...selectStyle, flex: 1, fontWeight: 'bold' }} disabled={!lineItem.categoryId}>
                                            <option value="">Ürün Seç...</option>{productsInCat.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                                        </select>
                                    </div>
                                </td>

                                <td style={cellStyle}>
                                    <select value={selectedColorId} onChange={e => handleColorChange(e.target.value)} style={selectStyle} disabled={!selectedProductId}>
                                        <option value="">Seç</option>{allColors.map(c => <option key={c.id} value={c.id}>{c.colorName}</option>)}
                                    </select>
                                </td>
                                <td style={cellStyle}>
                                    <select value={selectedDimensionId} onChange={e => handleDimensionChange(e.target.value)} style={selectStyle} disabled={!selectedColorId}>
                                        <option value="">Seç</option>{allDimensions.map(d => <option key={d.id} value={d.id}>{d.dimensionName}</option>)}
                                    </select>
                                </td>
                                <td style={cellStyle}>
                                    <select name="cushionId" value={lineItem.cushionId} onChange={handleLineChange} style={selectStyle}>
                                        <option value="">Yok</option>{cushions.map(c => <option key={c.id} value={c.id}>{c.cushionName}</option>)}
                                    </select>
                                </td>
                                <td style={cellStyle}>
                                    <input type="number" ref={quantityInputRef} name="quantity" value={lineItem.quantity} onChange={handleLineChange} style={{ ...smallInput, fontWeight: 'bold' }} />
                                </td>
                                <td style={cellStyle}>
                                    <input type="number" name="price" value={lineItem.price} onChange={handleLineChange} style={mediumInput} />
                                </td>
                                <td style={cellStyle}>
                                    <select name="supplyMethod" value={lineItem.supplyMethod} onChange={handleLineChange} style={{ ...selectStyle, fontSize: '11px', fontWeight: 'bold', color: lineItem.supplyMethod === 'Stoktan' ? '#27ae60' : '#e74c3c' }}>
                                        <option value="Stoktan">Depo</option>
                                        <option value="Merkezden">Merkez</option>
                                    </select>
                                </td>
                                <td style={{ ...cellStyle, textAlign: 'center', fontSize: '11px', color: '#555' }}>
                                    {selectedProductId && selectedColorId ? (
                                        <>
                                            <div><b>{currentFreeStock}</b></div>
                                            {currentFreeStock < requestedQty && <div style={{ color: 'red', fontWeight: 'bold', fontSize: '9px' }}>Eksik</div>}
                                        </>
                                    ) : "-"}
                                </td>
                                <td style={cellStyle}></td>
                            </tr>

                            {/* --- GİRİŞ SATIRI 2 (ÜRÜN NOTU) --- */}
                            <tr style={{ backgroundColor: getStockStatusColor(), borderBottom: '2px solid #3498db' }}>
                                <td colSpan={8} style={{ padding: '0 4px 4px 4px' }}>
                                    <input
                                        type="text"
                                        name="productNote"
                                        value={lineItem.productNote}
                                        onChange={handleLineChange}
                                        style={{ width: '90%', padding: '4px 8px', fontSize: '12px', height: '28px', borderRadius: '4px', border: '1px solid #ccc', fontStyle: 'italic', color: '#555', backgroundColor: 'rgba(255,255,255,0.7)' }}
                                        placeholder="Ürün Notu (Varsa)..."
                                    />
                                </td>
                                <td style={{ padding: '0 4px 4px 0', verticalAlign: 'top' }}>
                                    <button onClick={addLineItem} className="btn btn-primary" style={{ padding: '0', width: '100%', height: '28px', fontSize: '16px', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                </td>
                            </tr>

                            {/* --- EKLENEN LİSTE --- */}
                            {addedItems.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '6px 8px' }}>
                                        <div style={{ fontWeight: '600', color: '#2c3e50', fontSize: '13px' }}>{item.productName}</div>
                                        {item.productNote && <div style={{ fontSize: '11px', color: '#7f8c8d', fontStyle: 'italic', marginTop: '1px' }}>↳ {item.productNote}</div>}
                                    </td>
                                    <td style={{ padding: '6px', fontSize: '12px' }}>{allColors.find(c => c.id === item.colorId)?.colorName}</td>
                                    <td style={{ padding: '6px', fontSize: '12px' }}>{allDimensions.find(d => d.id === item.dimensionId)?.dimensionName || "-"}</td>
                                    <td style={{ padding: '6px', fontSize: '12px' }}>{cushions.find(c => c.id === item.cushionId)?.cushionName || "-"}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>{item.quantity}</td>
                                    <td style={{ fontSize: '13px' }}>{item.price} ₺</td>
                                    <td><span className={`badge ${item.supplyMethod === 'Stoktan' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>{item.supplyMethod}</span></td>
                                    <td>-</td>
                                    <td><button onClick={() => { const n = [...addedItems]; n.splice(idx, 1); setAddedItems(n) }} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}>×</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SaleAdd;