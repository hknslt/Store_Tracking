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

    // --- ÜRÜN & VARYANT YÖNETİMİ ---
    const [allRawProducts, setAllRawProducts] = useState<Product[]>([]);

    // 1. Kademe: İsimler
    const [uniqueProductNames, setUniqueProductNames] = useState<string[]>([]);

    // 2. Kademe: Renkler (İsim seçilince dolar)
    const [availableColors, setAvailableColors] = useState<Color[]>([]);

    // 3. Kademe: Ebatlar (Renk seçilince dolar - YENİ)
    const [availableDimensions, setAvailableDimensions] = useState<Dimension[]>([]);

    // --- TANIMLAR ---
    const [allColors, setAllColors] = useState<Color[]>([]);
    const [allDimensions, setAllDimensions] = useState<Dimension[]>([]); // İsim çakışmasın diye 'all' ekledik
    const [cushions, setCushions] = useState<Cushion[]>([]);

    // --- KULLANICI ---
    const [currentPersonnel, setCurrentPersonnel] = useState<Personnel | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // --- FİŞ BAŞLIĞI ---
    const [headerData, setHeaderData] = useState({
        date: new Date().toISOString().split('T')[0],
        receiptNo: "",
        storeId: ""
    });

    // --- SEÇİM STATE'LERİ ---
    const [selectedProductName, setSelectedProductName] = useState("");
    const [selectedColorId, setSelectedColorId] = useState("");
    const [selectedDimensionId, setSelectedDimensionId] = useState(""); // YENİ

    const [lineItem, setLineItem] = useState<Partial<PurchaseItem>>({
        groupId: "", categoryId: "", productId: "", productName: "",
        colorId: "", cushionId: "", dimensionId: "",
        quantity: 1, amount: 0, explanation: "", status: 'Alış'
    });

    const [addedItems, setAddedItems] = useState<PurchaseItem[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);

    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // 1. BAŞLANGIÇ
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

    // --- HANDLERS ---
    const handleHeaderChange = (e: any) => setHeaderData({ ...headerData, [e.target.name]: e.target.value });
    const handleLineChange = (e: any) => setLineItem({ ...lineItem, [e.target.name]: e.target.value });

    // GRUP -> Kategori Getir
    const handleGroupChange = async (groupId: string) => {
        setLineItem(prev => ({ ...prev, groupId, categoryId: "", productId: "" }));
        setSelectedProductName(""); setSelectedColorId(""); setSelectedDimensionId("");
        if (groupId) {
            const cats = await getCategoriesByGroupId(groupId);
            setCategories(cats);
        } else {
            setCategories([]);
        }
    };

    // KATEGORİ -> Tüm Varyantları Çek ve İsimleri Listele
    const handleCategoryChange = async (categoryId: string) => {
        setLineItem(prev => ({ ...prev, categoryId, productId: "" }));
        setSelectedProductName(""); setSelectedColorId(""); setSelectedDimensionId("");
        setUniqueProductNames([]);

        if (categoryId) {
            const rawProds = await getProductsByCategoryId(categoryId);
            setAllRawProducts(rawProds);

            // Benzersiz isimleri al
            const names = Array.from(new Set(rawProds.map(p => p.productName)));
            setUniqueProductNames(names);
        } else {
            setAllRawProducts([]);
        }
    };

    // 1. ÜRÜN ADI SEÇİLİNCE -> Renkleri Filtrele
    const handleProductNameChange = (prodName: string) => {
        setSelectedProductName(prodName);
        setSelectedColorId(""); setSelectedDimensionId(""); // Alt seçimleri sıfırla

        if (prodName) {
            // Bu isme sahip tüm varyantları bul
            const variants = allRawProducts.filter(p => p.productName === prodName);
            // Renk ID'lerini al
            const colorIds = variants.map(v => v.colorId);
            // Global renk listesinden eşleşenleri filtrele
            const filteredColors = allColors.filter(c => colorIds.includes(c.id!));
            setAvailableColors(filteredColors);
        } else {
            setAvailableColors([]);
        }
    };

    // 2. RENK SEÇİLİNCE -> Ebatları Filtrele
    const handleColorChange = (colorId: string) => {
        setSelectedColorId(colorId);
        setSelectedDimensionId(""); // Ebatı sıfırla

        if (selectedProductName && colorId) {
            // İsim ve Rengi tutan varyantları bul
            const variants = allRawProducts.filter(p =>
                p.productName === selectedProductName && p.colorId === colorId
            );

            // Ebat ID'lerini al
            const dimIds = variants.map(v => v.dimensionId).filter(id => id); // null olmayanlar

            if (dimIds.length > 0) {
                // Ebatlı ürünse ebatları listele
                const filteredDims = allDimensions.filter(d => dimIds.includes(d.id!));
                setAvailableDimensions(filteredDims);
            } else {
                // Ebatsız ürünse direkt seçimi tamamla (Tek varyant vardır)
                setAvailableDimensions([]);
                selectFinalProduct(variants[0]); // İlk (ve tek) varyantı seç
            }
        } else {
            setAvailableDimensions([]);
        }
    };

    // 3. EBAT SEÇİLİNCE -> Ürünü Tamamla
    const handleDimensionChange = (dimId: string) => {
        setSelectedDimensionId(dimId);
        if (selectedProductName && selectedColorId && dimId) {
            // İsim + Renk + Ebat eşleşen TEK ürünü bul
            const targetProduct = allRawProducts.find(p =>
                p.productName === selectedProductName &&
                p.colorId === selectedColorId &&
                p.dimensionId === dimId
            );

            if (targetProduct) {
                selectFinalProduct(targetProduct);
            }
        }
    };

    // --- SON AŞAMA: ÜRÜNÜ STATE'E İŞLEME ---
    const selectFinalProduct = (product: Product) => {
        const colorName = allColors.find(c => c.id === product.colorId)?.colorName || "";
        const dimName = allDimensions.find(d => d.id === product.dimensionId)?.dimensionName || "";

        // Ebat varsa isme ekle, yoksa ekleme
        const displayName = product.dimensionId
            ? `${product.productName} - ${colorName} ${dimName}`
            : `${product.productName} - ${colorName}`;

        setLineItem(prev => ({
            ...prev,
            productId: product.id,
            colorId: product.colorId,
            dimensionId: product.dimensionId || "",
            productName: displayName
        }));

        // Miktara odaklan
        setTimeout(() => quantityInputRef.current?.focus(), 100);
    };

    // LİSTEYE EKLE
    const addLineItem = () => {
        if (!lineItem.productId || !lineItem.quantity || !lineItem.amount) {
            showToast('error', "Ürün seçimi tamamlanmadı veya miktar/tutar eksik.");
            return;
        }

        setAddedItems([lineItem as PurchaseItem, ...addedItems]);

        // Temizle
        setLineItem(prev => ({
            ...prev,
            cushionId: "", quantity: 1, amount: 0, explanation: "",
            productId: "", productName: ""
        }));

        // Seçim kutularını sıfırla
        setSelectedProductName("");
        setSelectedColorId("");
        setSelectedDimensionId("");
        setAvailableColors([]);
        setAvailableDimensions([]);
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
            setLineItem({ groupId: "", categoryId: "", productId: "", productName: "", quantity: 1, amount: 0, explanation: "", status: 'Alış' });
            setSelectedProductName(""); setSelectedColorId(""); setSelectedDimensionId("");
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

            {/* --- FİŞ BAŞLIĞI --- */}
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
                    <div><label className="form-label">Fiş No</label><input name="receiptNo" value={headerData.receiptNo} onChange={handleHeaderChange} className="form-input" placeholder="IRS-001" /></div>
                </div>
            </div>

            {/* --- EXCEL GİRİŞ --- */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table dense" style={{ width: '100%' }}>
                        <thead style={{ backgroundColor: '#f1f2f6' }}>
                            <tr>
                                <th style={{ width: '10%' }}>Grup/Kat.</th>
                                <th style={{ width: '15%' }}>Ürün Adı</th>
                                <th style={{ width: '10%' }}>Renk</th>
                                <th style={{ width: '10%' }}>Ebat</th> {/* YENİ */}
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
                                    <select value={lineItem.groupId} onChange={e => handleGroupChange(e.target.value)} className="form-input input-sm" style={{ marginBottom: '2px' }}>
                                        <option value="">Grup...</option>
                                        {groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
                                    </select>
                                    <select value={lineItem.categoryId} onChange={e => handleCategoryChange(e.target.value)} className="form-input input-sm" disabled={!lineItem.groupId}>
                                        <option value="">Kat...</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <select value={selectedProductName} onChange={e => handleProductNameChange(e.target.value)} className="form-input input-sm" disabled={!lineItem.categoryId} style={{ fontWeight: 'bold' }}>
                                        <option value="">Seçiniz...</option>
                                        {uniqueProductNames.map((n, i) => <option key={i} value={n}>{n}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <select value={selectedColorId} onChange={e => handleColorChange(e.target.value)} className="form-input input-sm" disabled={!selectedProductName}>
                                        <option value="">Seç...</option>
                                        {availableColors.map(c => <option key={c.id} value={c.id}>{c.colorName}</option>)}
                                    </select>
                                </td>
                                <td>
                                    {/* EBAT SEÇİMİ (Eğer ürünün ebatı varsa aktif olur) */}
                                    <select
                                        value={selectedDimensionId}
                                        onChange={e => handleDimensionChange(e.target.value)}
                                        className="form-input input-sm"
                                        disabled={availableDimensions.length === 0}
                                        style={{ backgroundColor: availableDimensions.length === 0 ? '#eee' : 'white' }}
                                    >
                                        <option value="">{availableDimensions.length > 0 ? "Seç..." : "-"}</option>
                                        {availableDimensions.map(d => <option key={d.id} value={d.id}>{d.dimensionName}</option>)}
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

                            {/* LİSTE */}
                            {addedItems.map((item, idx) => (
                                <tr key={idx}>
                                    <td style={{ fontSize: '11px', color: '#888' }}>{groups.find(g => g.id === item.groupId)?.groupName}</td>
                                    <td style={{ fontWeight: '500' }}>{item.productName.split('-')[0]}</td>
                                    <td>{allColors.find(c => c.id === item.colorId)?.colorName}</td>
                                    <td>{allDimensions.find(d => d.id === item.dimensionId)?.dimensionName || "-"}</td>
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