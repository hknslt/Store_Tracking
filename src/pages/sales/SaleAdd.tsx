// src/pages/sales/SaleAdd.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { addSale } from "../../services/saleService";
import { getStores } from "../../services/storeService";
import { getStoreStocks } from "../../services/storeStockService";
import {
    getGroups,
    getCategoriesByGroupId,
    getCushions,
    getColors,
    getDimensions
} from "../../services/definitionService";
import { getProductsByCategoryId } from "../../services/productService";

import type { Sale, SaleItem, Store, Personnel, Group, Category, Product, Cushion, Color, Dimension, StoreStock } from "../../types";
import "../../App.css";

const SaleAdd = () => {
    const { currentUser } = useAuth();

    // Listeler
    const [stores, setStores] = useState<Store[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    // Ürün Seçim Data
    const [productsInCat, setProductsInCat] = useState<Product[]>([]);

    // Tanımlar
    const [allColors, setAllColors] = useState<Color[]>([]);
    const [allDimensions, setAllDimensions] = useState<Dimension[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);

    // Stoklar
    const [storeStocks, setStoreStocks] = useState<StoreStock[]>([]);

    // Kullanıcı
    const [currentPersonnel, setCurrentPersonnel] = useState<Personnel | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // Header (Termin Notu Burada -> customerNote)
    const [headerData, setHeaderData] = useState({
        date: new Date().toISOString().split('T')[0],
        receiptNo: "",
        storeId: "",
        customerName: "",
        phone: "",
        city: "",
        district: "",
        address: "",
        customerNote: "", // Termin Notu
        shippingCost: 0
    });

    // Satır State
    const [selectedProductId, setSelectedProductId] = useState("");
    const [selectedColorId, setSelectedColorId] = useState("");
    const [selectedDimensionId, setSelectedDimensionId] = useState("");

    const [lineItem, setLineItem] = useState<Partial<SaleItem>>({
        groupId: "", categoryId: "", productId: "", productName: "", cushionId: "",
        productNote: "", // Ürün Notu (Eskiden explanation idi)
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
        if (currentFreeStock === 0) return '#ffcccc';
        if (currentFreeStock < requestedQty) return '#fff3cd';
        return '#d4edda';
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
                    const u = userDoc.data() as Personnel;
                    setCurrentPersonnel(u);
                    if (u.role === 'admin') {
                        setIsAdmin(true);
                        getStores().then(setStores);
                    } else {
                        setIsAdmin(false);
                        setHeaderData(prev => ({ ...prev, storeId: u.storeId }));
                    }
                }
            }
        };
        initData();
    }, [currentUser]);

    useEffect(() => {
        if (headerData.storeId) {
            getStoreStocks(headerData.storeId).then(setStoreStocks);
        }
    }, [headerData.storeId]);

    // Handlers
    const handleHeaderChange = (e: any) => setHeaderData({ ...headerData, [e.target.name]: e.target.value });
    const handleLineChange = (e: any) => setLineItem({ ...lineItem, [e.target.name]: e.target.value });

    // Seçim Zinciri
    const handleGroupChange = async (groupId: string) => {
        setLineItem(prev => ({ ...prev, groupId, categoryId: "", productId: "" }));
        setSelectedProductId("");
        if (groupId) setCategories(await getCategoriesByGroupId(groupId));
        else setCategories([]);
    };

    const handleCategoryChange = async (categoryId: string) => {
        setLineItem(prev => ({ ...prev, categoryId, productId: "" }));
        setSelectedProductId("");
        if (categoryId) setProductsInCat(await getProductsByCategoryId(categoryId));
        else setProductsInCat([]);
    };

    const updateLineItem = (prodId: string, colId: string, dimId: string) => {
        const prod = productsInCat.find(p => p.id === prodId);
        const col = allColors.find(c => c.id === colId);
        const dim = allDimensions.find(d => d.id === dimId);

        if (prod) {
            let name = prod.productName;
            if (col) name += ` - ${col.colorName}`;
            if (dim) name += ` ${dim.dimensionName}`;

            setLineItem(prev => ({
                ...prev,
                productId: prodId,
                colorId: colId,
                dimensionId: dimId || null,
                productName: name
            }));
        }
    };

    const handleProductChange = (val: string) => { setSelectedProductId(val); updateLineItem(val, selectedColorId, selectedDimensionId); };
    const handleColorChange = (val: string) => { setSelectedColorId(val); updateLineItem(selectedProductId, val, selectedDimensionId); };
    const handleDimensionChange = (val: string) => { setSelectedDimensionId(val); updateLineItem(selectedProductId, selectedColorId, val); };

    useEffect(() => {
        if (selectedProductId && selectedColorId) {
            if (currentFreeStock <= 0) {
                setLineItem(prev => ({ ...prev, supplyMethod: 'Merkezden' }));
            } else {
                setLineItem(prev => ({ ...prev, supplyMethod: 'Stoktan' }));
            }
        }
    }, [selectedProductId, selectedColorId, selectedDimensionId, currentFreeStock]);

    const addLineItem = () => {
        if (!lineItem.productId || !selectedColorId || !lineItem.quantity || !lineItem.price) {
            setMessage({ type: 'error', text: 'Ürün, Renk, Adet ve Fiyat zorunludur.' }); return;
        }

        const total = (Number(lineItem.price) - Number(lineItem.discount || 0)) * Number(lineItem.quantity);
        setAddedItems([{ ...lineItem, total } as SaleItem, ...addedItems]);

        setLineItem(prev => ({
            ...prev,
            cushionId: "", quantity: 1, price: 0, discount: 0, productNote: "",
            productId: "", productName: "", colorId: "", dimensionId: null
        }));
        setSelectedProductId(""); setSelectedColorId(""); setSelectedDimensionId("");
    };

    const saveSale = async () => {
        if (!headerData.storeId || !headerData.customerName) {
            setMessage({ type: 'error', text: 'Mağaza ve Müşteri bilgileri zorunludur.' }); return;
        }
        if (addedItems.length === 0) {
            setMessage({ type: 'error', text: 'Ürün ekleyiniz.' }); return;
        }

        const grandTotal = addedItems.reduce((acc, item) => acc + item.total, 0) + Number(headerData.shippingCost);

        const saleData: Sale = {
            ...headerData,
            shippingCost: Number(headerData.shippingCost),
            personnelId: currentUser?.uid || "",
            personnelName: currentPersonnel?.fullName || "",
            items: addedItems,
            grandTotal,
            createdAt: new Date()
        };

        try {
            await addSale(saleData);
            setMessage({ type: 'success', text: 'Sipariş oluşturuldu!' });
            setAddedItems([]);
            setHeaderData(prev => ({ ...prev, receiptNo: "", customerName: "", phone: "", city: "", district: "", address: "", customerNote: "", shippingCost: 0 }));
            getStoreStocks(headerData.storeId).then(setStoreStocks);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        }
    };

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

            <div className="page-header">
                <div className="page-title"><h2>Yeni Sipariş / Satış</h2><p>Müşteri siparişi oluşturma ve stok kontrolü</p></div>
                {addedItems.length > 0 && (<button onClick={saveSale} className="btn btn-success">SİPARİŞİ TAMAMLA ({addedItems.reduce((acc, item) => acc + item.total, 0) + Number(headerData.shippingCost)} ₺)</button>)}
            </div>

            {/* MÜŞTERİ BİLGİLERİ */}
            <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div><label className="form-label">Tarih</label><input type="date" name="date" value={headerData.date} onChange={handleHeaderChange} className="form-input" /></div>
                    <div><label className="form-label">Mağaza</label>{isAdmin ? <select name="storeId" value={headerData.storeId} onChange={handleHeaderChange} className="form-input"><option value="">Seçiniz...</option>{stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}</select> : <input disabled value={currentPersonnel?.storeId ? "Mağazam" : "..."} className="form-input" style={{ backgroundColor: '#eee' }} />}</div>
                    <div><label className="form-label">Fiş No</label><input name="receiptNo" value={headerData.receiptNo} onChange={handleHeaderChange} className="form-input" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div><label className="form-label">Müşteri Adı</label><input name="customerName" value={headerData.customerName} onChange={handleHeaderChange} className="form-input" /></div>
                    <div><label className="form-label">Telefon</label><input name="phone" value={headerData.phone} onChange={handleHeaderChange} className="form-input" /></div>
                    <div><label className="form-label">İl</label><input name="city" value={headerData.city} onChange={handleHeaderChange} className="form-input" /></div>
                    <div><label className="form-label">İlçe</label><input name="district" value={headerData.district} onChange={handleHeaderChange} className="form-input" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px' }}>
                    <div><label className="form-label">Açık Adres</label><textarea name="address" value={headerData.address} onChange={handleHeaderChange} className="form-input" rows={1} style={{ resize: 'vertical' }} /></div>

                    {/* TERMİN NOTU */}
                    <div><label className="form-label">Termin Notu (Teslim Tarihi)</label><input name="customerNote" value={headerData.customerNote} onChange={handleHeaderChange} className="form-input" placeholder="Örn: 20 Mayıs" /></div>

                    <div><label className="form-label">Nakliye Ücreti</label><input type="number" name="shippingCost" value={headerData.shippingCost} onChange={handleHeaderChange} className="form-input" /></div>
                </div>
            </div>

            {/* ÜRÜN GİRİŞİ */}
            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                    <table className="data-table dense" style={{ minWidth: '1200px' }}>
                        <thead style={{ backgroundColor: '#f1f2f6' }}>
                            <tr>
                                <th style={{ width: '20%' }}>Ürün Seçimi</th>
                                <th style={{ width: '8%' }}>Renk</th>
                                <th style={{ width: '8%' }}>Ebat</th>
                                <th style={{ width: '7%' }}>Minder</th>
                                <th style={{ width: '15%' }}>Ürün Notu</th>
                                <th style={{ width: '6%' }}>Adet</th>
                                <th style={{ width: '8%' }}>Fiyat</th>
                                <th style={{ width: '10%' }}>Temin</th>
                                <th style={{ width: '10%' }}>Durum</th>
                                <th style={{ width: '5%' }}>+</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ backgroundColor: getStockStatusColor(), borderBottom: '2px solid #3498db' }}>
                                <td>
                                    <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                                        <select value={lineItem.groupId} onChange={e => handleGroupChange(e.target.value)} className="form-input input-sm" style={{ flex: 1 }}><option value="">Grup</option>{groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}</select>
                                        <select value={lineItem.categoryId} onChange={e => handleCategoryChange(e.target.value)} className="form-input input-sm" style={{ flex: 1 }} disabled={!lineItem.groupId}><option value="">Kat</option>{categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}</select>
                                    </div>
                                    <select value={selectedProductId} onChange={e => handleProductChange(e.target.value)} className="form-input input-sm" disabled={!lineItem.categoryId} style={{ fontWeight: 'bold' }}><option value="">Ürün Seç...</option>{productsInCat.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}</select>
                                </td>
                                <td><select value={selectedColorId} onChange={e => handleColorChange(e.target.value)} className="form-input input-sm" disabled={!selectedProductId}><option value="">Seç</option>{allColors.map(c => <option key={c.id} value={c.id}>{c.colorName}</option>)}</select></td>
                                <td><select value={selectedDimensionId} onChange={e => handleDimensionChange(e.target.value)} className="form-input input-sm" disabled={!selectedColorId}><option value="">Seç</option>{allDimensions.map(d => <option key={d.id} value={d.id}>{d.dimensionName}</option>)}</select></td>
                                <td><select name="cushionId" value={lineItem.cushionId} onChange={handleLineChange} className="form-input input-sm"><option value="">Yok</option>{cushions.map(c => <option key={c.id} value={c.id}>{c.cushionName}</option>)}</select></td>

                                {/* ÜRÜN NOTU GİRİŞİ */}
                                <td><input type="text" name="productNote" value={lineItem.productNote} onChange={handleLineChange} className="form-input input-sm" placeholder="Açıklama..." /></td>

                                <td><input type="number" ref={quantityInputRef} name="quantity" value={lineItem.quantity} onChange={handleLineChange} className="form-input input-sm" style={{ textAlign: 'center', fontWeight: 'bold' }} /></td>
                                <td><input type="number" name="price" value={lineItem.price} onChange={handleLineChange} className="form-input input-sm" /></td>
                                <td><select name="supplyMethod" value={lineItem.supplyMethod} onChange={handleLineChange} className="form-input input-sm" style={{ fontWeight: 'bold', color: lineItem.supplyMethod === 'Stoktan' ? '#27ae60' : '#e74c3c' }}><option value="Stoktan">Depodan</option><option value="Merkezden">Merkezden</option></select></td>
                                <td style={{ textAlign: 'center', fontSize: '11px', color: '#555' }}>{selectedProductId && selectedColorId ? <div>Mevcut: <b>{currentFreeStock}</b>{currentFreeStock < requestedQty && <div style={{ color: 'red', fontWeight: 'bold' }}>Yetersiz</div>}</div> : "-"}</td>
                                <td><button onClick={addLineItem} className="btn btn-primary" style={{ padding: '4px 10px' }}>+</button></td>
                            </tr>
                            {addedItems.map((item, idx) => (
                                <tr key={idx}>
                                    <td style={{ padding: '8px 10px' }}><span style={{ fontWeight: '600' }}>{item.productName}</span></td>
                                    <td>{allColors.find(c => c.id === item.colorId)?.colorName}</td>
                                    <td>{allDimensions.find(d => d.id === item.dimensionId)?.dimensionName || "-"}</td>
                                    <td>{cushions.find(c => c.id === item.cushionId)?.cushionName || "-"}</td>

                                    {/* ÜRÜN NOTU GÖSTERİMİ */}
                                    <td style={{ fontStyle: 'italic', color: '#666' }}>{item.productNote || "-"}</td>

                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                                    <td>{item.price} ₺</td>
                                    <td><span className={`badge ${item.supplyMethod === 'Stoktan' ? 'badge-success' : 'badge-danger'}`}>{item.supplyMethod}</span></td>
                                    <td>-</td>
                                    <td><button onClick={() => { const n = [...addedItems]; n.splice(idx, 1); setAddedItems(n) }} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>×</button></td>
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