// src/pages/purchases/PurchaseAdd.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { addPurchase, getPendingRequests, deletePendingRequests } from "../../services/purchaseService";
import { getStores } from "../../services/storeService";
import { getGroups, getCategoriesByGroupId, getCushions, getColors, getDimensions } from "../../services/definitionService";
import { getProductsByCategoryId } from "../../services/productService";

import type { Purchase, PurchaseItem, Store, SystemUser, Group, Category, Product, Color, Dimension, Cushion, PendingRequest } from "../../types";
import "../../App.css";

const PurchaseAdd = () => {
    const { currentUser } = useAuth();

    // --- LİSTELER ---
    const [stores, setStores] = useState<Store[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [productsInCat, setProductsInCat] = useState<Product[]>([]);
    const [allColors, setAllColors] = useState<Color[]>([]);
    const [allDimensions, setAllDimensions] = useState<Dimension[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);

    const [currentUserData, setCurrentUserData] = useState<SystemUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // --- BEKLEYEN TALEPLER ---
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);

    // --- BAŞLIK STATE ---
    const [headerData, setHeaderData] = useState({
        date: new Date().toISOString().split('T')[0],
        receiptNo: "",
        storeId: ""
    });

    // --- SATIR STATE ---
    const [selectedProductId, setSelectedProductId] = useState("");
    const [selectedColorId, setSelectedColorId] = useState("");
    const [selectedDimensionId, setSelectedDimensionId] = useState("");

    const [lineItem, setLineItem] = useState<Partial<PurchaseItem>>({
        groupId: "", categoryId: "", productId: "", productName: "", colorId: "", cushionId: "", dimensionId: null,
        quantity: 1, amount: 0, explanation: "", status: 'Beklemede'
    });

    const [addedItems, setAddedItems] = useState<PurchaseItem[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);

    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // --- BAŞLANGIÇ ---
    useEffect(() => {
        const init = async () => {
            const [g, c, col, dim] = await Promise.all([getGroups(), getCushions(), getColors(), getDimensions()]);
            setGroups(g); setCushions(c); setAllColors(col); setAllDimensions(dim);

            if (currentUser) {
                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    // TİP DÜZELTMESİ: Verinin SystemUser olduğunu belirtiyoruz
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
        init();
    }, [currentUser]);

    // ... (Diğer useEffect ve handler'lar AYNI KALACAK) ...
    // Aşağısı önceki kodun aynısıdır.

    // --- TALEPLERİ ÇEK ---
    useEffect(() => {
        if (headerData.storeId) {
            getPendingRequests(headerData.storeId).then(setPendingRequests);
        } else {
            setPendingRequests([]);
        }
    }, [headerData.storeId]);

    // --- HANDLERS ---
    const handleHeaderChange = (e: any) => setHeaderData({ ...headerData, [e.target.name]: e.target.value });
    const handleLineChange = (e: any) => setLineItem({ ...lineItem, [e.target.name]: e.target.value });

    const handleGroupChange = async (groupId: string) => { setLineItem(prev => ({ ...prev, groupId, categoryId: "", productId: "" })); setSelectedProductId(""); setProductsInCat([]); if (groupId) setCategories(await getCategoriesByGroupId(groupId)); else setCategories([]); };
    const handleCategoryChange = async (categoryId: string) => { setLineItem(prev => ({ ...prev, categoryId, productId: "" })); setSelectedProductId(""); if (categoryId) setProductsInCat(await getProductsByCategoryId(categoryId)); else setProductsInCat([]); };
    const handleProductChange = (pid: string) => { setSelectedProductId(pid); updateItemName(pid, selectedColorId, selectedDimensionId); };
    const handleColorChange = (cid: string) => { setSelectedColorId(cid); updateItemName(selectedProductId, cid, selectedDimensionId); };
    const handleDimensionChange = (did: string) => { setSelectedDimensionId(did); updateItemName(selectedProductId, selectedColorId, did); if (did) setTimeout(() => quantityInputRef.current?.focus(), 100); };

    const updateItemName = (pid: string, cid: string, did: string) => {
        const p = productsInCat.find(x => x.id === pid); const c = allColors.find(x => x.id === cid); const d = allDimensions.find(x => x.id === did);
        if (p) {
            let name = p.productName; if (c) name += ` - ${c.colorName}`; if (d) name += ` ${d.dimensionName}`;
            setLineItem(prev => ({ ...prev, productId: pid, colorId: cid, dimensionId: did || null, productName: name }));
        }
    };

    const addLineItem = () => {
        if (!lineItem.productId || !selectedColorId || !lineItem.quantity) { showToast('error', "Ürün ve Renk seçimi zorunludur."); return; }

        const newItem: PurchaseItem = {
            ...(lineItem as PurchaseItem),
            itemType: 'Stok',
            status: 'Beklemede'
        };

        setAddedItems([...addedItems, newItem]);
        setLineItem(prev => ({ ...prev, cushionId: "", quantity: 1, amount: 0, explanation: "", productId: "", productName: "", colorId: "", dimensionId: null }));
        setSelectedProductId(""); setSelectedColorId(""); setSelectedDimensionId("");
    };

    const addRequestToReceipt = (req: PendingRequest) => {
        const newItem: PurchaseItem = {
            groupId: req.groupId,
            categoryId: req.categoryId,
            productId: req.productId,
            productName: req.productName,
            colorId: req.colorId,
            cushionId: req.cushionId,
            dimensionId: req.dimensionId,
            quantity: req.quantity,
            amount: 0,
            explanation: req.productNote || "",
            status: 'Beklemede',
            itemType: 'Sipariş'
        };

        setAddedItems([...addedItems, newItem]);
        setPendingRequests(prev => prev.filter(p => p.id !== req.id));
        if (req.id) setSelectedRequestIds(prev => [...prev, req.id!]);
    };

    const saveReceipt = async () => {
        if (!headerData.storeId) return showToast('error', "Mağaza seçimi zorunludur!");
        if (addedItems.length === 0) return showToast('error', "Ürün ekleyiniz.");

        const purchaseData: Purchase = {
            storeId: headerData.storeId,
            type: 'Alış',
            date: headerData.date,
            receiptNo: headerData.receiptNo,
            personnelId: currentUser?.uid || "",
            personnelName: currentUserData?.fullName || "",
            items: addedItems,
            totalAmount: addedItems.reduce((sum, item) => sum + Number(item.amount), 0),
            createdAt: new Date()
        };

        try {
            await addPurchase(purchaseData);
            if (selectedRequestIds.length > 0) {
                await deletePendingRequests(headerData.storeId, selectedRequestIds);
            }
            showToast('success', "Alış Fişi Kaydedildi!");
            setAddedItems([]);
            setSelectedRequestIds([]);
            setHeaderData(prev => ({ ...prev, receiptNo: "" }));
            getPendingRequests(headerData.storeId).then(setPendingRequests);
        } catch (error: any) {
            showToast('error', error.message);
        }
    };

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

            <div className="page-header">
                <div className="page-title"><h2>Alış / Stok Giriş</h2></div>
                {addedItems.length > 0 && <button onClick={saveReceipt} className="btn btn-success">KAYDET ({addedItems.reduce((a, b) => a + Number(b.amount), 0)} ₺)</button>}
            </div>

            {/* BAŞLIK */}
            <div className="card" style={{ marginBottom: '15px', padding: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                    <div><label className="form-label">Tarih</label><input type="date" name="date" value={headerData.date} onChange={handleHeaderChange} className="form-input" /></div>
                    <div><label className="form-label">Mağaza</label>{isAdmin ? <select name="storeId" value={headerData.storeId} onChange={handleHeaderChange} className="form-input"><option value="">Seç...</option>{stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}</select> : <input disabled value="Mağazam" className="form-input" />}</div>
                    <div><label className="form-label">Fiş No</label><input name="receiptNo" value={headerData.receiptNo} onChange={handleHeaderChange} className="form-input" /></div>
                </div>
            </div>

            {/* ÜRÜN EKLEME */}
            <div className="card">
                <div className="card-header"><h3>Manuel Ürün Ekle</h3></div>
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table dense">
                        <thead style={{ backgroundColor: '#eaf2f8' }}>
                            <tr>
                                <th style={{ width: '25%' }}>Ürün Seçimi</th>
                                <th style={{ width: '10%' }}>Renk</th>
                                <th style={{ width: '10%' }}>Ebat</th>
                                <th style={{ width: '10%' }}>Minder</th>
                                <th style={{ width: '8%' }}>Adet</th>
                                <th style={{ width: '10%' }}>Fiyat</th>
                                <th>Açıklama</th>
                                <th style={{ width: '5%' }}>+</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div style={{ display: 'flex', gap: '2px', marginBottom: '5px' }}>
                                        <select value={lineItem.groupId} onChange={e => handleGroupChange(e.target.value)} className="form-input input-sm" style={{ flex: 1 }}><option value="">Grup</option>{groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}</select>
                                        <select value={lineItem.categoryId} onChange={e => handleCategoryChange(e.target.value)} className="form-input input-sm" style={{ flex: 1 }} disabled={!lineItem.groupId}><option value="">Kat</option>{categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}</select>
                                    </div>
                                    <select value={selectedProductId} onChange={e => handleProductChange(e.target.value)} className="form-input input-sm" disabled={!lineItem.categoryId} style={{ fontWeight: 'bold' }}><option value="">Ürün Seç...</option>{productsInCat.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}</select>
                                </td>
                                <td><select value={selectedColorId} onChange={e => handleColorChange(e.target.value)} className="form-input input-sm" disabled={!selectedProductId}><option value="">Seç</option>{allColors.map(c => <option key={c.id} value={c.id}>{c.colorName}</option>)}</select></td>
                                <td><select value={selectedDimensionId} onChange={e => handleDimensionChange(e.target.value)} className="form-input input-sm" disabled={!selectedColorId}><option value="">Seç</option>{allDimensions.map(d => <option key={d.id} value={d.id}>{d.dimensionName}</option>)}</select></td>
                                <td><select name="cushionId" value={lineItem.cushionId} onChange={handleLineChange} className="form-input input-sm"><option value="">Yok</option>{cushions.map(c => <option key={c.id} value={c.id}>{c.cushionName}</option>)}</select></td>
                                <td><input type="number" ref={quantityInputRef} name="quantity" value={lineItem.quantity} onChange={handleLineChange} className="form-input input-sm" style={{ textAlign: 'center', fontWeight: 'bold' }} /></td>
                                <td><input type="number" name="amount" value={lineItem.amount} onChange={handleLineChange} className="form-input input-sm" /></td>
                                <td><input type="text" name="explanation" value={lineItem.explanation} onChange={handleLineChange} className="form-input input-sm" onKeyDown={e => e.key === 'Enter' && addLineItem()} /></td>
                                <td><button onClick={addLineItem} className="btn btn-primary" style={{ padding: '4px 8px' }}>+</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SEPET */}
            {addedItems.length > 0 && (
                <div className="card" style={{ marginTop: '20px' }}>
                    <div className="card-header" style={{ backgroundColor: '#e8f8f5' }}><h3>🛒 Fişe Eklenecek Ürünler</h3></div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead><tr><th>Ürün</th><th>Renk / Ebat</th><th>Miktar</th><th>Fiyat</th><th>Açıklama</th><th>Sil</th></tr></thead>
                            <tbody>
                                {addedItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: '600' }}>{item.productName}</td>
                                        <td>{allColors.find(c => c.id === item.colorId)?.colorName} {item.dimensionId && ` / ${allDimensions.find(d => d.id === item.dimensionId)?.dimensionName}`}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                                        <td>{item.amount} ₺</td>
                                        <td style={{ fontStyle: 'italic', color: '#555' }}>{item.explanation}</td>
                                        <td><button onClick={() => { const n = [...addedItems]; n.splice(idx, 1); setAddedItems(n) }} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}>×</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* BEKLEYEN TALEPLER */}
            {pendingRequests.length > 0 && (
                <div className="card" style={{ marginTop: '20px', border: '2px solid #f39c12' }}>
                    <div className="card-header" style={{ backgroundColor: '#fef9e7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ color: '#d35400', margin: 0 }}>⏳ Satışlardan Gelen Bekleyen Talepler</h3>
                        <span className="badge badge-warning">{pendingRequests.length} Adet</span>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="data-table dense">
                            <thead>
                                <tr><th style={{ width: '15%' }}>Sipariş No</th><th style={{ width: '20%' }}>Müşteri</th><th style={{ width: '25%' }}>Ürün</th><th style={{ width: '20%' }}>Renk / Ebat</th><th style={{ width: '10%', textAlign: 'center' }}>Adet</th><th style={{ width: '10%' }}>İşlem</th></tr>
                            </thead>
                            <tbody>
                                {pendingRequests.map(req => (
                                    <tr key={req.id}>
                                        <td style={{ fontWeight: 'bold' }}>{req.saleReceiptNo}</td>
                                        <td>{req.customerName}</td>
                                        <td>{req.productName.split('-')[0]}</td>
                                        <td>{allColors.find(c => c.id === req.colorId)?.colorName} {req.dimensionId && ` / ${allDimensions.find(d => d.id === req.dimensionId)?.dimensionName}`}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{req.quantity}</td>
                                        <td><button onClick={() => addRequestToReceipt(req)} className="btn btn-sm btn-primary" style={{ width: '100%', fontSize: '11px', padding: '4px' }}>⬇️ Fişe Ekle</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseAdd;