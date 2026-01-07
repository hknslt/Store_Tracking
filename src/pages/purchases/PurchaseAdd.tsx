// src/pages/purchases/PurchaseAdd.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

import { addPurchase } from "../../services/purchaseService";
import {
    getGroups,
    getCategoriesByGroupId,
    getColors,
    getDimensions,
    getCushions
} from "../../services/definitionService";
import { getProductsByCategoryId } from "../../services/productService";
import { getStores } from "../../services/storeService";

import type { Group, Category, Product, Color, Dimension, Cushion, PurchaseItem, Store, Personnel } from "../../types";
import "../../App.css";

const PurchaseAdd = () => {
    const { currentUser } = useAuth();

    // --- LİSTELER ---
    const [stores, setStores] = useState<Store[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    // Ürün Listesi (Base Products)
    const [productsInCat, setProductsInCat] = useState<Product[]>([]);

    // Tanımlar
    const [allColors, setAllColors] = useState<Color[]>([]);
    const [allDimensions, setAllDimensions] = useState<Dimension[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);

    // Kullanıcı
    const [currentPersonnel, setCurrentPersonnel] = useState<Personnel | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // Fiş Başlığı
    const [headerData, setHeaderData] = useState({
        date: new Date().toISOString().split('T')[0],
        receiptNo: "",
        storeId: ""
    });

    // --- SEÇİM STATE'LERİ ---
    const [selectedProductId, setSelectedProductId] = useState(""); // ID tutuyoruz
    const [selectedColorId, setSelectedColorId] = useState("");
    const [selectedDimensionId, setSelectedDimensionId] = useState("");

    const [lineItem, setLineItem] = useState<Partial<PurchaseItem>>({
        groupId: "", categoryId: "", productId: "", productName: "",
        colorId: "", cushionId: "", dimensionId: null,
        quantity: 1, amount: 0, explanation: "", status: 'Alış'
    });

    const [addedItems, setAddedItems] = useState<PurchaseItem[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);

    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // 1. BAŞLANGIÇ VERİLERİ
    useEffect(() => {
        const initData = async () => {
            try {
                const [g, c, col, dim] = await Promise.all([
                    getGroups(), getCushions(), getColors(), getDimensions()
                ]);
                setGroups(g);
                setCushions(c);
                setAllColors(col);
                setAllDimensions(dim);

                if (currentUser) {
                    const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data() as Personnel;
                        setCurrentPersonnel(userData);
                        if (userData.role === 'admin') {
                            setIsAdmin(true);
                            getStores().then(setStores);
                        } else {
                            setIsAdmin(false);
                            setHeaderData(prev => ({ ...prev, storeId: userData.storeId }));
                        }
                    }
                }
            } catch (error) {
                console.error(error);
                showToast('error', "Veri yükleme hatası.");
            }
        };
        initData();
    }, [currentUser]);

    // HANDLERS
    const handleHeaderChange = (e: any) => setHeaderData({ ...headerData, [e.target.name]: e.target.value });
    const handleLineChange = (e: any) => setLineItem({ ...lineItem, [e.target.name]: e.target.value });

    // GRUP DEĞİŞİNCE
    const handleGroupChange = async (groupId: string) => {
        setLineItem(prev => ({ ...prev, groupId, categoryId: "", productId: "" }));
        setSelectedProductId("");
        setProductsInCat([]); // Ürün listesini temizle

        if (groupId) {
            const cats = await getCategoriesByGroupId(groupId);
            setCategories(cats);
        } else {
            setCategories([]);
        }
    };

    // KATEGORİ DEĞİŞİNCE -> ÜRÜNLERİ GETİR
    const handleCategoryChange = async (categoryId: string) => {
        setLineItem(prev => ({ ...prev, categoryId, productId: "" }));
        setSelectedProductId("");

        if (categoryId) {
            // Servisten ürünleri çek
            const prods = await getProductsByCategoryId(categoryId);
            setProductsInCat(prods);
        } else {
            setProductsInCat([]);
        }
    };

    // ÜRÜN SEÇİLİNCE
    const handleProductChange = (productId: string) => {
        setSelectedProductId(productId);

        // Ürün adını bul ve state'e yaz (şimdilik ham hali)
        const product = productsInCat.find(p => p.id === productId);
        if (product) {
            updateLineItemName(product.productName, selectedColorId, selectedDimensionId);
            setLineItem(prev => ({ ...prev, productId }));
        }
    };

    // RENK DEĞİŞİNCE
    const handleColorChange = (colorId: string) => {
        setSelectedColorId(colorId);
        const product = productsInCat.find(p => p.id === selectedProductId);
        if (product) {
            updateLineItemName(product.productName, colorId, selectedDimensionId);
        }
    };

    // EBAT DEĞİŞİNCE
    const handleDimensionChange = (dimId: string) => {
        setSelectedDimensionId(dimId);
        const product = productsInCat.find(p => p.id === selectedProductId);
        if (product) {
            updateLineItemName(product.productName, selectedColorId, dimId);
        }
        // Ebat seçilince miktara odaklan
        if (dimId) setTimeout(() => quantityInputRef.current?.focus(), 100);
    };

    // İSİM GÜNCELLEME YARDIMCISI
    const updateLineItemName = (baseName: string, colId: string, dimId: string) => {
        const colName = allColors.find(c => c.id === colId)?.colorName || "";
        const dimName = allDimensions.find(d => d.id === dimId)?.dimensionName || "";

        let fullName = baseName;
        if (colName) fullName += ` - ${colName}`;
        if (dimName) fullName += ` ${dimName}`;

        setLineItem(prev => ({
            ...prev,
            productName: fullName,
            colorId: colId,
            dimensionId: dimId || null
        }));
    };

    // YARDIMCILAR
    const getDimName = (id?: string | null) => id ? (allDimensions.find(d => d.id === id)?.dimensionName || "") : "";
    const getCatName = (id?: string) => categories.find(c => c.id === id)?.categoryName || "";

    // LİSTEYE EKLE
    const addLineItem = () => {
        // Kontrol: Ürün ve Renk zorunlu, Ebat opsiyonel
        if (!lineItem.productId || !selectedColorId || !lineItem.quantity || !lineItem.amount) {
            showToast('error', "Ürün, Renk, Miktar ve Fiyat zorunludur.");
            return;
        }

        setAddedItems([lineItem as PurchaseItem, ...addedItems]);

        // Temizle (Grup, Kategori kalsın)
        setLineItem(prev => ({
            ...prev,
            cushionId: "", quantity: 1, amount: 0, explanation: "",
            productId: "", productName: "", colorId: "", dimensionId: null
        }));

        // Alt seçimleri sıfırla
        setSelectedProductId("");
        setSelectedColorId("");
        setSelectedDimensionId("");
    };

    const removeLineItem = (index: number) => {
        const newList = [...addedItems];
        newList.splice(index, 1);
        setAddedItems(newList);
    };

    const saveReceipt = async () => {
        if (!headerData.storeId) return showToast('error', "Mağaza seçilmedi!");
        if (!headerData.receiptNo) return showToast('error', "Fiş numarası girilmedi!");
        if (addedItems.length === 0) return showToast('error', "Listeye ürün eklenmedi!");

        const totalAmount = addedItems.reduce((sum, item) => sum + Number(item.amount), 0);
        const purchaseData = {
            storeId: headerData.storeId,
            date: headerData.date,
            receiptNo: headerData.receiptNo,
            personnelId: currentUser?.uid || "unknown",
            personnelName: currentPersonnel?.fullName || "Bilinmiyor",
            items: addedItems,
            totalAmount: totalAmount,
            createdAt: new Date()
        };

        try {
            await addPurchase(purchaseData);
            showToast('success', "Fiş kaydedildi!");
            setAddedItems([]);
            setHeaderData(prev => ({ ...prev, receiptNo: "" }));

            // Full Reset
            setLineItem({ groupId: "", categoryId: "", productId: "", productName: "", quantity: 1, amount: 0, explanation: "", status: 'Alış', colorId: "", dimensionId: null });
            setSelectedProductId(""); setSelectedColorId(""); setSelectedDimensionId("");
        } catch (error: any) {
            showToast('error', "Hata: " + error.message);
        }
    };

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
                    <h2>Mal Kabul / İade Fişi</h2>
                </div>
                {addedItems.length > 0 && (
                    <button onClick={saveReceipt} className="btn btn-success" style={{ padding: '10px 20px' }}>
                        💾 KAYDET ({addedItems.reduce((a, b) => a + Number(b.amount), 0)} ₺)
                    </button>
                )}
            </div>

            {/* FİŞ BAŞLIĞI */}
            <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div><label className="form-label">Tarih</label><input type="date" name="date" value={headerData.date} onChange={handleHeaderChange} className="form-input" /></div>
                    <div><label className="form-label">Mağaza</label>
                        {isAdmin ? (
                            <select name="storeId" value={headerData.storeId} onChange={handleHeaderChange} className="form-input">
                                <option value="">-- Mağaza Seç --</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                            </select>
                        ) : <input disabled value={currentPersonnel ? "📍 Kendi Mağazam" : "..."} className="form-input" style={{ backgroundColor: '#eee' }} />}
                    </div>
                    <div><label className="form-label">Fiş No</label><input name="receiptNo" value={headerData.receiptNo} onChange={handleHeaderChange} className="form-input" placeholder="Fiş No
                    " /></div>
                </div>
            </div>

            {/* ÜRÜN GİRİŞ TABLOSU */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table dense" style={{ width: '100%' }}>
                        <thead style={{ backgroundColor: '#f1f2f6' }}>
                            <tr>
                                <th style={{ width: '20%' }}>Ürün Seçimi (Grup/Kat/Ad)</th>
                                <th style={{ width: '10%' }}>Renk</th>
                                <th style={{ width: '10%' }}>Ebat</th>
                                <th style={{ width: '10%' }}>Minder</th>
                                <th style={{ width: '8%' }}>Durum</th>
                                <th style={{ width: '7%' }}>Adet</th>
                                <th style={{ width: '8%' }}>Tutar</th>
                                <th>Açıklama</th>
                                <th style={{ width: '5%' }}>+</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* INPUT SATIRI */}
                            <tr style={{ backgroundColor: '#eaf2f8', borderBottom: '2px solid #3498db' }}>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            <select value={lineItem.groupId} onChange={e => handleGroupChange(e.target.value)} className="form-input input-sm" style={{ flex: 1 }}>
                                                <option value="">Grup...</option>
                                                {groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
                                            </select>
                                            <select value={lineItem.categoryId} onChange={e => handleCategoryChange(e.target.value)} className="form-input input-sm" style={{ flex: 1 }} disabled={!lineItem.groupId}>
                                                <option value="">Kat...</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                                            </select>
                                        </div>
                                        {/* ÜRÜN SEÇİMİ - ID KULLANARAK */}
                                        <select
                                            value={selectedProductId}
                                            onChange={e => handleProductChange(e.target.value)}
                                            className="form-input input-sm"
                                            disabled={!lineItem.categoryId}
                                            style={{ fontWeight: 'bold' }}
                                        >
                                            <option value="">Ürün Seçiniz...</option>
                                            {productsInCat.map(p => (
                                                <option key={p.id} value={p.id}>{p.productName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </td>
                                <td>
                                    <select value={selectedColorId} onChange={e => handleColorChange(e.target.value)} className="form-input input-sm" disabled={!selectedProductId}>
                                        <option value="">Seç...</option>
                                        {allColors.map(c => <option key={c.id} value={c.id}>{c.colorName}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <select
                                        value={selectedDimensionId}
                                        onChange={e => handleDimensionChange(e.target.value)}
                                        className="form-input input-sm"
                                        disabled={!selectedColorId}
                                    >
                                        <option value="">Seç...</option>
                                        {allDimensions.map(d => <option key={d.id} value={d.id}>{d.dimensionName}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <select name="cushionId" value={lineItem.cushionId} onChange={handleLineChange} className="form-input input-sm">
                                        <option value="">Yok</option>
                                        {cushions.map(c => <option key={c.id} value={c.id}>{c.cushionName}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <select name="status" value={lineItem.status} onChange={handleLineChange} className="form-input input-sm">
                                        <option value="Alış">Alış</option>
                                        <option value="İade">İade</option>
                                    </select>
                                </td>
                                <td>
                                    <input type="number" ref={quantityInputRef} name="quantity" value={lineItem.quantity} onChange={handleLineChange} className="form-input input-sm" style={{ textAlign: 'center' }} />
                                </td>
                                <td>
                                    <input type="number" name="amount" value={lineItem.amount} onChange={handleLineChange} className="form-input input-sm" />
                                </td>
                                <td>
                                    <input type="text" name="explanation" value={lineItem.explanation} onChange={handleLineChange} className="form-input input-sm" onKeyDown={e => e.key === 'Enter' && addLineItem()} />
                                </td>
                                <td>
                                    <button onClick={addLineItem} className="btn btn-primary" style={{ padding: '4px 8px' }}>+</button>
                                </td>
                            </tr>

                            {/* EKLENEN LİSTE */}
                            {addedItems.map((item, idx) => (
                                <tr key={idx}>
                                    <td style={{ padding: 8 }}>
                                        <span style={{ fontWeight: '600', color: '#34495e', marginRight: '5px' }}>
                                            {item.productName.split('-')[0].trim()}
                                        </span>
                                        {item.dimensionId && (
                                            <span style={{ color: '#e67e22', fontWeight: 'bold', marginRight: '5px' }}>
                                                {getDimName(item.dimensionId)}
                                            </span>
                                        )}
                                        <span style={{ color: '#95a5a6', fontSize: '12px', marginTop: '2px' }}>
                                            {getCatName(item.categoryId)}
                                        </span>
                                    </td>

                                    <td>{allColors.find(c => c.id === item.colorId)?.colorName}</td>
                                    <td>{getDimName(item.dimensionId) || "-"}</td>
                                    <td>{cushions.find(c => c.id === item.cushionId)?.cushionName || "-"}</td>
                                    <td>{item.status}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                                    <td>{item.amount} ₺</td>
                                    <td style={{ fontSize: '12px' }}>{item.explanation}</td>
                                    <td><button onClick={() => removeLineItem(idx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>×</button></td>
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