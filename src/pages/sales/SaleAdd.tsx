// src/pages/sales/SaleAdd.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { addSale } from "../../services/saleService";
import { getStores } from "../../services/storeService";
import {
    getGroups,
    getCategoriesByGroupId,
    getCushions,
    getColors,
    getDimensions // Ebat servisi
} from "../../services/definitionService";
import { getProductsByCategoryId } from "../../services/productService";

import type { Sale, SaleItem, Store, Personnel, Group, Category, Product, Cushion, Color, Dimension } from "../../types";
import "../../App.css";

const SaleAdd = () => {
    const { currentUser } = useAuth();

    // --- LİSTELER ---
    const [stores, setStores] = useState<Store[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    // --- ÜRÜN SEÇİM DATALARI ---
    const [allRawProducts, setAllRawProducts] = useState<Product[]>([]);

    // 1. İsimler
    const [uniqueProductNames, setUniqueProductNames] = useState<string[]>([]);
    // 2. Renkler
    const [availableColors, setAvailableColors] = useState<Color[]>([]);
    // 3. Ebatlar
    const [availableDimensions, setAvailableDimensions] = useState<Dimension[]>([]);

    // --- TANIMLAR ---
    const [cushions, setCushions] = useState<Cushion[]>([]);
    const [allColors, setAllColors] = useState<Color[]>([]);
    const [allDimensions, setAllDimensions] = useState<Dimension[]>([]);

    // --- KULLANICI ---
    const [currentPersonnel, setCurrentPersonnel] = useState<Personnel | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // --- FORM HEADER ---
    const [headerData, setHeaderData] = useState({
        date: new Date().toISOString().split('T')[0],
        receiptNo: "",
        storeId: "",
        customerName: "",
        phone: "",
        city: "",
        district: "",
        address: "",
        customerNote: "",
        sshNote: "",
        shippingNote: "",
        shippingCost: 0
    });

    // --- INPUT ROW STATE ---
    const [selectedProductName, setSelectedProductName] = useState("");
    const [selectedColorId, setSelectedColorId] = useState("");
    const [selectedDimensionId, setSelectedDimensionId] = useState("");

    const [lineItem, setLineItem] = useState<Partial<SaleItem>>({
        groupId: "", categoryId: "", productId: "", productName: "", cushionId: "",
        productNote: "", quantity: 1, price: 0, discount: 0, deadline: "", status: 'Sipariş'
    });

    const [addedItems, setAddedItems] = useState<SaleItem[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);

    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // --- BAŞLANGIÇ ---
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
                showToast('error', "Veriler yüklenirken hata oluştu.");
            }
        };
        initData();
    }, [currentUser]);

    // --- YARDIMCI ---
    const getDimName = (id?: string | null) => id ? (allDimensions.find(d => d.id === id)?.dimensionName || "") : "";
    const getCatName = (id?: string) => categories.find(c => c.id === id)?.categoryName || "";

    // --- HANDLERS ---
    const handleHeaderChange = (e: any) => {
        setHeaderData({ ...headerData, [e.target.name]: e.target.value });
    };

    const handleLineChange = (e: any) => {
        setLineItem({ ...lineItem, [e.target.name]: e.target.value });
    };

    // Grup Seçimi
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

    // Kategori Seçimi
    const handleCategoryChange = async (categoryId: string) => {
        setLineItem(prev => ({ ...prev, categoryId, productId: "" }));
        setSelectedProductName(""); setSelectedColorId(""); setSelectedDimensionId("");
        setUniqueProductNames([]);

        if (categoryId) {
            const rawProds = await getProductsByCategoryId(categoryId);
            setAllRawProducts(rawProds);
            const names = Array.from(new Set(rawProds.map(p => p.productName)));
            setUniqueProductNames(names);
        } else {
            setAllRawProducts([]);
        }
    };

    // 1. Ürün Adı Seçimi
    const handleProductNameChange = (prodName: string) => {
        setSelectedProductName(prodName);
        setSelectedColorId(""); setSelectedDimensionId("");

        if (prodName) {
            const variants = allRawProducts.filter(p => p.productName === prodName);
            const variantColorIds = variants.map(v => v.colorId);
            const filteredColors = allColors.filter(c => variantColorIds.includes(c.id!));
            setAvailableColors(filteredColors);
        } else {
            setAvailableColors([]);
        }
    };

    // 2. Renk Seçimi -> Ebatları Filtrele veya Ürünü Seç
    const handleColorChange = (colorId: string) => {
        setSelectedColorId(colorId);
        setSelectedDimensionId("");

        if (selectedProductName && colorId) {
            const variants = allRawProducts.filter(p =>
                p.productName === selectedProductName && p.colorId === colorId
            );

            const dimIds = variants.map(v => v.dimensionId).filter(id => id);

            if (dimIds.length > 0) {
                const filteredDims = allDimensions.filter(d => dimIds.includes(d.id!));
                setAvailableDimensions(filteredDims);
            } else {
                setAvailableDimensions([]);
                selectFinalProduct(variants[0]);
            }
        } else {
            setAvailableDimensions([]);
        }
    };

    // 3. Ebat Seçimi -> Ürünü Tamamla
    const handleDimensionChange = (dimId: string) => {
        setSelectedDimensionId(dimId);
        if (selectedProductName && selectedColorId && dimId) {
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

    // ORTAK: Ürünü State'e İşle
    const selectFinalProduct = (product: Product) => {
        const colorName = allColors.find(c => c.id === product.colorId)?.colorName || "";
        const dimName = getDimName(product.dimensionId);

        const displayName = product.dimensionId
            ? `${product.productName} - ${colorName} ${dimName}`
            : `${product.productName} - ${colorName}`;

        setLineItem(prev => ({
            ...prev,
            productId: product.id,
            productName: displayName,
            dimensionId: product.dimensionId ? product.dimensionId : null
        }));

        setTimeout(() => quantityInputRef.current?.focus(), 100);
    };

    // Enter Tuşu
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') addLineItem();
    };

    // LİSTEYE EKLE
    const addLineItem = () => {
        if (!lineItem.productId || !lineItem.quantity || !lineItem.price) {
            return showToast('error', "Ürün, Renk, Adet ve Fiyat zorunludur!");
        }

        const total = (Number(lineItem.price) - Number(lineItem.discount || 0)) * Number(lineItem.quantity);
        setAddedItems([{ ...lineItem, total } as SaleItem, ...addedItems]);

        // Temizle
        setLineItem(prev => ({
            ...prev,
            cushionId: "", quantity: 1, price: 0, discount: 0, productNote: "",
            productId: "", productName: ""
        }));
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

    // KAYDET
    const saveSale = async () => {
        if (!headerData.storeId || !headerData.receiptNo || !headerData.customerName) {
            return showToast('error', "Mağaza, Fiş No ve Müşteri Adı zorunludur!");
        }
        if (addedItems.length === 0) return showToast('error', "Listeye ürün ekleyiniz.");

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
            showToast('success', "Satış Başarıyla Kaydedildi!");

            // Temizlik
            setAddedItems([]);
            setHeaderData(prev => ({ ...prev, receiptNo: "", customerName: "", phone: "", address: "", customerNote: "", shippingCost: 0 }));
            setLineItem({ groupId: "", categoryId: "", productId: "", productName: "", quantity: 1, price: 0, discount: 0, status: 'Sipariş' });
            setSelectedProductName(""); setSelectedColorId(""); setSelectedDimensionId("");

        } catch (error: any) {
            console.error(error);
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
                    <h2>Yeni Satış Oluştur</h2>
                    <p>Müşteri siparişi ve satış kaydı</p>
                </div>
                <div>
                    {addedItems.length > 0 && (
                        <button onClick={saveSale} className="btn btn-success" style={{ padding: '12px 25px', fontSize: '15px' }}>
                            💾 SATIŞI TAMAMLA ({addedItems.reduce((acc, item) => acc + item.total, 0) + Number(headerData.shippingCost)} ₺)
                        </button>
                    )}
                </div>
            </div>

            {/* --- 1. MÜŞTERİ KARTI --- */}
            <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#7f8c8d', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                    Müşteri & Teslimat Bilgileri
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label className="form-label">Tarih</label>
                        <input type="date" name="date" value={headerData.date} onChange={handleHeaderChange} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">Fiş No</label>
                        <input type="text" name="receiptNo" value={headerData.receiptNo} onChange={handleHeaderChange} className="form-input" placeholder="Satış Fiş No" />
                    </div>
                    <div>
                        <label className="form-label">Mağaza</label>
                        {isAdmin ? (
                            <select name="storeId" value={headerData.storeId} onChange={handleHeaderChange} className="form-input">
                                <option value="">Seçiniz...</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                            </select>
                        ) : (
                            <input disabled value={currentPersonnel?.storeId ? "📍 Mağazam" : "..."} className="form-input" style={{ backgroundColor: '#eee' }} />
                        )}
                    </div>
                    <div>
                        <label className="form-label">Personel</label>
                        <input disabled value={currentPersonnel?.fullName || ""} className="form-input" style={{ backgroundColor: '#eee' }} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div>
                        <label className="form-label">Müşteri Adı</label>
                        <input type="text" name="customerName" value={headerData.customerName} onChange={handleHeaderChange} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">Telefon</label>
                        <input type="text" name="phone" value={headerData.phone} onChange={handleHeaderChange} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">İl / İlçe</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <input type="text" name="city" placeholder="İl" value={headerData.city} onChange={handleHeaderChange} className="form-input" />
                            <input type="text" name="district" placeholder="İlçe" value={headerData.district} onChange={handleHeaderChange} className="form-input" />
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Nakliye Ücreti</label>
                        <input type="number" name="shippingCost" value={headerData.shippingCost} onChange={handleHeaderChange} className="form-input" placeholder="0" />
                    </div>
                </div>

                <div style={{ marginTop: '15px' }}>
                    <label className="form-label">Açık Adres</label>
                    <textarea name="address" value={headerData.address} onChange={handleHeaderChange} className="form-input" rows={2} style={{ resize: 'none' }} />
                </div>
            </div>

            {/* --- 2. ÜRÜN GİRİŞ TABLOSU --- */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table dense" style={{ width: '100%' }}>
                        <thead style={{ backgroundColor: '#f1f2f6', position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th style={{ width: '10%' }}>Grup</th>
                                <th style={{ width: '10%' }}>Kategori</th>
                                <th style={{ width: '15%' }}>Ürün Adı</th>
                                <th style={{ width: '9%' }}>Renk</th>
                                <th style={{ width: '9%' }}>Ebat</th>
                                <th style={{ width: '8%' }}>Minder</th>
                                <th style={{ width: '8%' }}>Not</th>
                                <th style={{ width: '6%' }}>Adet</th>
                                <th style={{ width: '8%' }}>Fiyat</th>
                                <th style={{ width: '7%' }}>İskonto</th>
                                <th style={{ width: '8%' }}>Durum</th>
                                <th style={{ width: '6%', textAlign: 'center' }}>+</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* --- INPUT SATIRI --- */}
                            <tr style={{ backgroundColor: '#fff8e1', borderBottom: '2px solid #f39c12' }}>
                                <td>
                                    <select value={lineItem.groupId} onChange={e => handleGroupChange(e.target.value)} className="form-input input-sm">
                                        <option value="">Seç...</option>
                                        {groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <select value={lineItem.categoryId} onChange={e => handleCategoryChange(e.target.value)} className="form-input input-sm" disabled={!lineItem.groupId}>
                                        <option value="">Seç...</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <select value={selectedProductName} onChange={e => handleProductNameChange(e.target.value)} className="form-input input-sm" disabled={!lineItem.categoryId} style={{ fontWeight: 'bold' }}>
                                        <option value="">Ürün...</option>
                                        {uniqueProductNames.map((name, i) => <option key={i} value={name}>{name}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <select value={selectedColorId} onChange={e => handleColorChange(e.target.value)} className="form-input input-sm" disabled={!selectedProductName}>
                                        <option value="">Renk...</option>
                                        {availableColors.map(c => <option key={c.id} value={c.id}>{c.colorName}</option>)}
                                    </select>
                                </td>
                                <td>
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
                                    <select value={lineItem.cushionId} onChange={e => setLineItem({ ...lineItem, cushionId: e.target.value })} className="form-input input-sm">
                                        <option value="">Yok</option>
                                        {cushions.map(c => <option key={c.id} value={c.id}>{c.cushionName}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <input type="text" value={lineItem.productNote} onChange={e => setLineItem({ ...lineItem, productNote: e.target.value })} className="form-input input-sm" placeholder="..." />
                                </td>
                                <td>
                                    <input
                                        type="number" ref={quantityInputRef}
                                        value={lineItem.quantity} onChange={e => setLineItem({ ...lineItem, quantity: Number(e.target.value) })}
                                        className="form-input input-sm" style={{ textAlign: 'center' }}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number" value={lineItem.price}
                                        onChange={e => setLineItem({ ...lineItem, price: Number(e.target.value) })}
                                        className="form-input input-sm" placeholder="0"
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number" value={lineItem.discount}
                                        onChange={e => setLineItem({ ...lineItem, discount: Number(e.target.value) })}
                                        onKeyDown={handleKeyDown}
                                        className="form-input input-sm" placeholder="0"
                                    />
                                </td>
                                <td>
                                    <select value={lineItem.status} onChange={e => setLineItem({ ...lineItem, status: e.target.value as any })} className="form-input input-sm">
                                        <option value="Sipariş">Sipariş</option>
                                        <option value="Stok">Stoktan</option>
                                        <option value="Teslim">Teslim</option>
                                    </select>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <button onClick={addLineItem} className="btn btn-warning" style={{ padding: '6px 12px', color: 'white' }}>+</button>
                                </td>
                            </tr>

                            {/* --- LİSTE --- */}
                            {addedItems.map((item, index) => (
                                <tr key={index}>
                                    <td colSpan={2} style={{ fontSize: '11px', color: '#95a5a6' }}>
                                        {/* BURADA ÜRÜN BİLGİSİ BİRLEŞTİRİLMEDİ, YUKARIDAKİ INPUTLARA UYUYOR. DETAY TABLOSU SALE LIST'TE */}
                                        {groups.find(g => g.id === item.groupId)?.groupName} / {categories.find(c => c.id === item.categoryId)?.categoryName}
                                    </td>

                                    {/* YENİ GÖRÜNÜM: ÜRÜN ADI + EBAT YAN YANA */}
                                    <td style={{ padding: 8 }}>
                                        <span style={{ fontWeight: '600', color: '#34495e', marginRight: '5px' }}>
                                            {item.productName.split('-')[0].trim()}
                                        </span>
                                        {item.dimensionId && (
                                            <span style={{ color: '#e67e22', fontWeight: 'bold' }}>
                                                {getDimName(item.dimensionId)}
                                            </span>
                                        )}
                                    </td>

                                    <td>{allColors.find(c => c.id === item.colorId)?.colorName}</td>
                                    {/* Ebat sütunu boş kalabilir çünkü ebatı isme ekledik, ama hizalama bozulmasın diye tire koyuyoruz */}
                                    <td>-</td>
                                    <td><small>{cushions.find(c => c.id === item.cushionId)?.cushionName || "-"}</small></td>
                                    <td style={{ fontStyle: 'italic', fontSize: '12px' }}>{item.productNote}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                                    <td>{item.price} ₺</td>
                                    <td style={{ color: 'red' }}>-{item.discount}</td>
                                    <td><span className="badge">{item.status}</span></td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button onClick={() => removeLineItem(index)} style={{ color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}>×</button>
                                    </td>
                                </tr>
                            ))}

                            {addedItems.length === 0 && (
                                <tr>
                                    <td colSpan={12} style={{ padding: '40px', textAlign: 'center', color: '#bdc3c7' }}>
                                        Sepet boş. Yukarıdan ürün ekleyiniz.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- TOPLAM KISMI --- */}
                {addedItems.length > 0 && (
                    <div style={{ padding: '15px', borderTop: '1px solid #eee', backgroundColor: '#fdfdfd', textAlign: 'right' }}>
                        <div style={{ marginBottom: '5px', fontSize: '14px', color: '#7f8c8d' }}>
                            Ara Toplam: <b>{addedItems.reduce((acc, item) => acc + item.total, 0)} ₺</b>
                        </div>
                        {headerData.shippingCost > 0 && (
                            <div style={{ marginBottom: '5px', fontSize: '14px', color: '#7f8c8d' }}>
                                Nakliye: <b>+{headerData.shippingCost} ₺</b>
                            </div>
                        )}
                        <h3 style={{ color: '#2c3e50', margin: '5px 0 10px 0' }}>
                            Genel Toplam: {addedItems.reduce((acc, item) => acc + item.total, 0) + Number(headerData.shippingCost)} ₺
                        </h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SaleAdd;