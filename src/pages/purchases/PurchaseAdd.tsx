// src/pages/purchases/PurchaseAdd.tsx
import { useState, useEffect, useRef } from "react";
// ... (Importlar aynı)
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { addPurchase } from "../../services/purchaseService";
import { getGroups, getCategoriesByGroupId, getColors, getDimensions, getCushions } from "../../services/definitionService";
import { getProductsByCategoryId } from "../../services/productService";
import { getStores } from "../../services/storeService";
import type { PurchaseItem, Store, Personnel, Group, Category, Product, Color, Dimension, Cushion, PurchaseType } from "../../types";
import "../../App.css";

const PurchaseAdd = () => {
    const { currentUser } = useAuth();
    // ... (Listeler ve Tanımlar State'leri aynı)
    const [stores, setStores] = useState<Store[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [productsInCat, setProductsInCat] = useState<Product[]>([]);
    const [allColors, setAllColors] = useState<Color[]>([]);
    const [allDimensions, setAllDimensions] = useState<Dimension[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);
    const [currentPersonnel, setCurrentPersonnel] = useState<Personnel | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // --- BAŞLIK STATE ---
    const [transactionType, setTransactionType] = useState<PurchaseType>('Alış');
    const [headerData, setHeaderData] = useState({
        date: new Date().toISOString().split('T')[0],
        receiptNo: "",
        storeId: "",
        contactName: "" // İade ise Müşteri Adı, Alış ise Boş
    });

    // ... (Satır Item State'leri aynı)
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

    // ... (useEffect ve Veri Çekme aynı)
    useEffect(() => {
        const init = async () => {
            const [g, c, col, dim] = await Promise.all([getGroups(), getCushions(), getColors(), getDimensions()]);
            setGroups(g); setCushions(c); setAllColors(col); setAllDimensions(dim);
            if (currentUser) {
                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    const u = userDoc.data() as Personnel;
                    setCurrentPersonnel(u);
                    if (u.role === 'admin') { setIsAdmin(true); getStores().then(setStores); }
                    else { setIsAdmin(false); setHeaderData(p => ({ ...p, storeId: u.storeId })); }
                }
            }
        };
        init();
    }, [currentUser]);

    const handleHeaderChange = (e: any) => setHeaderData({ ...headerData, [e.target.name]: e.target.value });
    const handleLineChange = (e: any) => setLineItem({ ...lineItem, [e.target.name]: e.target.value });

    useEffect(() => {
        // Alış ise Beklemede, İade ise Tamamlandı olarak başlar
        setLineItem(prev => ({
            ...prev,
            status: transactionType === 'İade' ? 'Tamamlandı' : 'Beklemede'
        }));
    }, [transactionType]);

    // ... (Grup, Kategori, Ürün seçim handlers aynı)
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
        if (!lineItem.productId || !selectedColorId || !lineItem.quantity || !lineItem.amount) { showToast('error', "Ürün, Renk, Miktar ve Tutar zorunludur."); return; }
        setAddedItems([...addedItems, lineItem as PurchaseItem]);
        setLineItem(prev => ({ ...prev, cushionId: "", quantity: 1, amount: 0, explanation: "", productId: "", productName: "", colorId: "", dimensionId: null }));
        setSelectedProductId(""); setSelectedColorId(""); setSelectedDimensionId("");
    };

    const saveReceipt = async () => {
        if (!headerData.storeId) return showToast('error', "Mağaza seçimi zorunludur!");
        // İade işleminde isim zorunlu olsun, Alışta olmasın
        if (transactionType === 'İade' && !headerData.contactName) return showToast('error', "İade eden müşteri adı zorunludur!");
        if (addedItems.length === 0) return showToast('error', "Ürün ekleyiniz.");

        const purchaseData = {
            storeId: headerData.storeId,
            type: transactionType,
            contactName: transactionType === 'İade' ? headerData.contactName : "Merkez", // Alış ise "Merkez" yazabiliriz veya boş bırakabiliriz
            date: headerData.date,
            receiptNo: headerData.receiptNo,
            personnelId: currentUser?.uid || "unknown",
            personnelName: currentPersonnel?.fullName || "Bilinmiyor",
            items: addedItems,
            totalAmount: addedItems.reduce((sum, item) => sum + Number(item.amount), 0),
            createdAt: new Date()
        };

        try {
            await addPurchase(purchaseData);
            showToast('success', "İşlem kaydedildi!");
            setAddedItems([]);
            setHeaderData(prev => ({ ...prev, receiptNo: "", contactName: "" }));
        } catch (error: any) {
            showToast('error', error.message);
        }
    };

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

            <div className="page-header">
                <div className="page-title">
                    <h2>Stok Giriş / Talep Oluştur</h2>
                </div>
                {addedItems.length > 0 && (
                    <button onClick={saveReceipt} className="btn btn-success">
                        KAYDET ({addedItems.reduce((a, b) => a + Number(b.amount), 0)} ₺)
                    </button>
                )}
            </div>

            <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'flex', gap: '30px', marginBottom: '15px' }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#2980b9' }}>
                        <input type="radio" checked={transactionType === 'Alış'} onChange={() => setTransactionType('Alış')} />
                        📦 ALIŞ (Merkezden)
                    </label>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#c0392b' }}>
                        <input type="radio" checked={transactionType === 'İade'} onChange={() => setTransactionType('İade')} />
                        ↩️ İADE (Müşteriden)
                    </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div><label className="form-label">Tarih</label><input type="date" name="date" value={headerData.date} onChange={handleHeaderChange} className="form-input" /></div>
                    <div><label className="form-label">Mağaza</label>
                        {isAdmin ? <select name="storeId" value={headerData.storeId} onChange={handleHeaderChange} className="form-input"><option value="">Seçiniz...</option>{stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}</select>
                            : <input disabled value={currentPersonnel ? "📍 Mağazam" : ""} className="form-input" style={{ backgroundColor: '#eee' }} />}
                    </div>

                    {/* SADECE İADE İSE GÖSTER */}
                    {transactionType === 'İade' && (
                        <div>
                            <label className="form-label">İade Eden Müşteri</label>
                            <input name="contactName" value={headerData.contactName} onChange={handleHeaderChange} className="form-input" placeholder="Müşteri Adı..." />
                        </div>
                    )}

                    <div><label className="form-label">Fiş / Belge No</label><input name="receiptNo" value={headerData.receiptNo} onChange={handleHeaderChange} className="form-input" /></div>
                </div>
            </div>

            {/* Ürün Giriş Tablosu (Aynı) */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table dense" style={{ width: '100%' }}>
                        <thead style={{ backgroundColor: transactionType === 'Alış' ? '#eaf2f8' : '#fdedec' }}>
                            <tr>
                                <th style={{ width: '20%' }}>Ürün</th>
                                <th style={{ width: '10%' }}>Renk</th>
                                <th style={{ width: '10%' }}>Ebat</th>
                                <th style={{ width: '10%' }}>Minder</th>
                                <th style={{ width: '10%' }}>Adet</th>
                                <th style={{ width: '10%' }}>Birim Fiyat</th>
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
                            {addedItems.map((item, idx) => (
                                <tr key={idx}>
                                    <td style={{ padding: '8px 12px' }}><span style={{ fontWeight: '600' }}>{item.productName}</span></td>
                                    <td>{allColors.find(c => c.id === item.colorId)?.colorName}</td>
                                    <td>{allDimensions.find(d => d.id === item.dimensionId)?.dimensionName || "-"}</td>
                                    <td>{cushions.find(c => c.id === item.cushionId)?.cushionName || "-"}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                                    <td>{item.amount} ₺</td>
                                    <td>{item.explanation}</td>
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

export default PurchaseAdd;