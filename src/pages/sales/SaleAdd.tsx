// src/pages/sales/SaleAdd.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { addSale, getNextReceiptNo } from "../../services/saleService";
import { getStores, getPersonnelByStore } from "../../services/storeService";
import { getStoreStocks } from "../../services/storeStockService";
import {
    getGroups,
    getCategories,
    getCushions,
    getColors,
    getDimensions
} from "../../services/definitionService";
import { getProducts } from "../../services/productService";
import { useNavigate } from "react-router-dom";

// ŞEHİR VERİSİ
import { iller } from "../../constants/cities";

import type { Sale, SaleItem, Store, SystemUser, Personnel, Group, Category, Product, Cushion, Color, Dimension, StoreStock } from "../../types";
import "../../App.css";

const SaleAdd = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Listeler
    const [stores, setStores] = useState<Store[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);

    //   TÜM VERİLER (Filtreleme için hafızada tutuyoruz)
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);

    //   GÖRÜNEN LİSTELER (Seçime göre değişen)
    const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

    const [allColors, setAllColors] = useState<Color[]>([]);
    const [allDimensions, setAllDimensions] = useState<Dimension[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);

    const [storeStocks, setStoreStocks] = useState<StoreStock[]>([]);
    const [storePersonnel, setStorePersonnel] = useState<(Personnel | SystemUser)[]>([]);
    const [districts, setDistricts] = useState<string[]>([]);

    const [currentUserData, setCurrentUserData] = useState<SystemUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // Header State
    const [headerData, setHeaderData] = useState({
        date: new Date().toISOString().split('T')[0],
        receiptNo: "",
        storeId: "",
        personnelId: "",
        personnelName: "",
        customerName: "",
        tc: "",
        email: "",
        phone: "",
        city: "",
        district: "",
        address: "",
        deadline: new Date().toISOString().split('T')[0],
        shippingCost: 0,
        explanation: ""
    });

    const [phoneCode, setPhoneCode] = useState("+90");

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

    // YARDIMCILAR
    const getName = (list: any[], id: string | null | undefined, key: string) => list.find(x => x.id === id)?.[key] || "-";

    const formatPhone = (value: string) => value.replace(/\D/g, '');

    //   GÜNCELLENEN FONKSİYON: Türkçe Karakter Duyarlı Baş Harf Büyütme
    const capitalizeWords = (str: string) => {
        if (!str) return "";
        return str.split(" ").map(word => {
            if (word.length === 0) return "";
            // İlk harfi Türkçe locale göre büyüt, kalanı olduğu gibi bırak veya küçült
            // (Burada sadece ilk harfi büyütüyoruz, kalanı kullanıcının yazdığı gibi kalıyor)
            return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1);
        }).join(" ");
    };

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

    // --- 1. VERİLERİ YÜKLE ---
    useEffect(() => {
        const initData = async () => {
            const [g, c, col, dim, cats, prods] = await Promise.all([
                getGroups(), getCushions(), getColors(), getDimensions(), getCategories(), getProducts()
            ]);
            setGroups(g);
            setCushions(c);
            setAllColors(col);
            setAllDimensions(dim);
            setAllCategories(cats);
            setAllProducts(prods);

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

    // Mağaza Değişince Çalışanlar, Stoklar ve FİŞ NO Getir
    useEffect(() => {
        if (headerData.storeId) {
            getStoreStocks(headerData.storeId).then(setStoreStocks);
            getPersonnelByStore(headerData.storeId).then(data => {
                const sorted = data.sort((a, b) => a.fullName.localeCompare(b.fullName));
                setStorePersonnel(sorted as (Personnel | SystemUser)[]);
            });

            getNextReceiptNo(headerData.storeId).then(nextNo => {
                setHeaderData(prev => ({ ...prev, receiptNo: nextNo }));
            });

        } else {
            setStorePersonnel([]);
            setStoreStocks([]);
            setHeaderData(prev => ({ ...prev, receiptNo: "" }));
        }
    }, [headerData.storeId]);

    // HEADER CHANGE
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
        else if (name === 'city') {
            const selectedCity = iller.find(i => i.isim === value);
            setDistricts(selectedCity ? selectedCity.ilceler : []);
            setHeaderData(prev => ({ ...prev, city: value, district: "" }));
        }
        else if (name === 'phone') {
            setHeaderData(prev => ({ ...prev, phone: formatPhone(value) }));
        }
        else if (name === 'customerName' || name === 'address') {
            setHeaderData(prev => ({ ...prev, [name]: capitalizeWords(value) }));
        }
        else {
            setHeaderData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleLineChange = (e: any) => setLineItem({ ...lineItem, [e.target.name]: e.target.value });

    // --- SEÇİM ZİNCİRİ ---
    const handleGroupChange = (groupId: string) => {
        setLineItem(prev => ({ ...prev, groupId, categoryId: "", productId: "" }));
        setSelectedProductId("");
        if (groupId) {
            const filtered = allCategories.filter(c => c.groupId === groupId);
            setFilteredCategories(filtered);
        } else {
            setFilteredCategories([]);
        }
        setFilteredProducts([]);
    };

    const handleCategoryChange = (categoryId: string) => {
        setLineItem(prev => ({ ...prev, categoryId, productId: "" }));
        setSelectedProductId("");
        if (categoryId) {
            const filtered = allProducts.filter(p => p.categoryId === categoryId);
            setFilteredProducts(filtered);
        } else {
            setFilteredProducts([]);
        }
    };

    const updateLineItem = (prodId: string, colId: string, dimId: string) => {
        const prod = filteredProducts.find(p => p.id === prodId);
        if (prod) {
            let name = prod.productName;
            setLineItem(prev => ({ ...prev, productId: prodId, colorId: colId, dimensionId: dimId || null, productName: name }));
        }
    };

    const handleProductChange = (val: string) => { setSelectedProductId(val); updateLineItem(val, selectedColorId, selectedDimensionId); };
    const handleColorChange = (val: string) => { setSelectedColorId(val); updateLineItem(selectedProductId, val, selectedDimensionId); };
    const handleDimensionChange = (val: string) => { setSelectedDimensionId(val); updateLineItem(selectedProductId, selectedColorId, val); };

    useEffect(() => {
        if (selectedProductId && selectedColorId) {
            if (currentFreeStock <= 0) { setLineItem(prev => ({ ...prev, supplyMethod: 'Merkezden' })); }
            else { setLineItem(prev => ({ ...prev, supplyMethod: 'Stoktan' })); }
        }
    }, [selectedProductId, selectedColorId, selectedDimensionId, currentFreeStock]);

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
        if (!headerData.receiptNo.trim()) { setMessage({ type: 'error', text: 'Lütfen Fiş No giriniz.' }); return; }

        const grandTotal = addedItems.reduce((acc, item) => acc + item.total, 0) + Number(headerData.shippingCost);
        const combinedPhone = `${phoneCode} ${headerData.phone}`;

        const saleData: Sale = {
            ...headerData,
            phone: combinedPhone,
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
            setTimeout(() => navigate('/sales'), 1000);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        }
    };

    // ---   CANLI ÜRÜN TOPLAMI ---
    const itemsTotal = addedItems.reduce((acc, item) => acc + item.total, 0);

    // Stiller
    const cellStyle = { padding: '6px', verticalAlign: 'middle' };
    const smallInput = { width: '60px', padding: '6px', fontSize: '13px', textAlign: 'center' as const };
    const mediumInput = { width: '80px', padding: '6px', fontSize: '13px' };
    const selectStyle = { width: '100%', padding: '6px', fontSize: '12px' };
    const filterSelectStyle = { width: '90px', padding: '6px', fontSize: '11px', marginRight: '4px' };

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

            <div className="modern-header">
                <div>
                    <h2>Yeni Sipariş / Satış</h2>
                    <p>Müşteri siparişi oluşturma</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate('/sales')} className="modern-btn btn-secondary">İptal</button>
                    {addedItems.length > 0 && (<button onClick={saveSale} className="modern-btn btn-success">SİPARİŞİ TAMAMLA ({itemsTotal + Number(headerData.shippingCost)} ₺)</button>)}
                </div>
            </div>

            {/* --- SİPARİŞ BİLGİLERİ --- */}
            <div className="card" style={{ marginBottom: '15px', padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '15px' }}>

                    <div>
                        <label className="form-label">Tarih {isAdmin && <span style={{ fontSize: '10px', color: 'green' }}>(Admin)</span>}</label>
                        <input
                            type="date"
                            name="date"
                            value={headerData.date}
                            onChange={handleHeaderChange}
                            className="form-input"
                            disabled={!isAdmin}
                            style={{ backgroundColor: !isAdmin ? '#f1f5f9' : 'white' }}
                        />
                    </div>

                    <div>
                        <label className="form-label">Mağaza</label>
                        {isAdmin ?
                            <select name="storeId" value={headerData.storeId} onChange={handleHeaderChange} className="form-input"><option value="">Seçiniz...</option>{stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}</select>
                            : <input disabled value={currentUserData?.storeId ? "Mağazam" : "..."} className="form-input" style={{ backgroundColor: '#f1f5f9' }} />
                        }
                    </div>

                    <div>
                        <label className="form-label">Fiş No <span style={{ color: 'red' }}>*</span></label>
                        <input name="receiptNo" value={headerData.receiptNo} onChange={handleHeaderChange} className="form-input" placeholder="Otomatik..." />
                    </div>

                    <div>
                        <label className="form-label">Satış Personeli</label>
                        <select name="personnelId" value={headerData.personnelId} onChange={handleHeaderChange} className="form-input" disabled={!headerData.storeId}>
                            <option value="">-- Seç --</option>
                            {storePersonnel.map(p => (<option key={p.id} value={p.id}>{p.fullName}</option>))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>

                    <div>
                        <label className="form-label">Müşteri Adı</label>
                        <input name="customerName" value={headerData.customerName} onChange={handleHeaderChange} className="form-input" placeholder="Ad Soyad" />
                    </div>
                    <div>
                        <label className="form-label">TC Kimlik No <span style={{ fontSize: '11px', color: '#999' }}></span></label>
                        <input
                            name="tc"
                            value={headerData.tc}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                                handleHeaderChange({ target: { name: 'tc', value: val } });
                            }}
                            className="form-input"
                            placeholder="11 Haneli"
                        />
                    </div>

                    {/* E-Posta */}
                    <div>
                        <label className="form-label">E-Posta <span style={{ fontSize: '11px', color: '#999' }}></span></label>
                        <input name="email" type="email" value={headerData.email} onChange={handleHeaderChange} className="form-input" placeholder="ornek@mail.com" />
                    </div>

                    <div>
                        <label className="form-label">Telefon</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <select
                                value={phoneCode}
                                onChange={(e) => setPhoneCode(e.target.value)}
                                className="form-input"
                                style={{ width: '70px', padding: '0 5px' }}
                            >
                                <option value="+90">+90</option>
                                <option value="+49">+49</option>
                                <option value="+44">+44</option>
                                <option value="+1">+1</option>
                                <option value="+30">+30</option>
                                <option value="+33">+33</option>
                                <option value="+39">+39</option>
                                <option value="+7">+7</option>
                                <option value="+972">+972</option>
                            </select>
                            <input
                                name="phone"
                                value={headerData.phone}
                                onChange={handleHeaderChange}
                                className="form-input"
                                placeholder="5XX XXX XX XX"
                                maxLength={15}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">İl</label>
                        <select name="city" value={headerData.city} onChange={handleHeaderChange} className="form-input">
                            <option value="">Seçiniz...</option>
                            {iller.map(il => (<option key={il.id} value={il.isim}>{il.isim}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">İlçe</label>
                        <select name="district" value={headerData.district} onChange={handleHeaderChange} className="form-input" disabled={!headerData.city}>
                            <option value="">Seçiniz...</option>
                            {districts.map((ilce, index) => (<option key={index} value={ilce}>{ilce}</option>))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '15px' }}>
                    <div>
                        <label className="form-label">Açık Adres</label>
                        <input name="address" value={headerData.address} onChange={handleHeaderChange} className="form-input" placeholder="Mahalle, Cadde, Sokak, No..." />
                    </div>
                    <div>
                        <label className="form-label">Termin Tarihi</label>
                        <input type="date" name="deadline" value={headerData.deadline} onChange={handleHeaderChange} className="form-input" />
                    </div>
                </div>

                <div style={{ marginTop: '15px' }}>
                    <label className="form-label">Sipariş Açıklaması / Notu</label>
                    <textarea
                        name="explanation"
                        value={headerData.explanation}
                        onChange={handleHeaderChange}
                        className="form-input"
                        rows={1}
                    />
                </div>
            </div>

            {/* ÜRÜN GİRİŞİ */}
            <div className="card">
                {/*   GÜNCEL KART BAŞLIĞI: Toplam Tutar Eklendi */}
                <div className="card-header" style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#2c3e50' }}>Ürün Girişi</h3>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#27ae60' }}>
                        Ürünler Toplamı: {itemsTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </span>
                </div>

                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                    <table className="modern-table dense">
                        <thead style={{ backgroundColor: '#f8fafc' }}>
                            <tr>
                                <th style={{ width: '30%' }}>Ürün Seçimi (Grup - Kat - Ad)</th>
                                <th style={{ width: '10%' }}>Renk</th>
                                <th style={{ width: '10%' }}>Ebat</th>
                                <th style={{ width: '10%' }}>Minder</th>
                                <th style={{ width: '6%', textAlign: 'center' }}>Adet</th>
                                <th style={{ width: '8%' }}>Fiyat</th>
                                <th style={{ width: '10%' }}>Temin</th>
                                <th style={{ width: '8%', textAlign: 'center' }}>Stok</th>
                                <th style={{ width: '5%' }}>+</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* --- GİRİŞ SATIRI 1 --- */}
                            <tr style={{ backgroundColor: getStockStatusColor(), borderTop: '2px solid #3b82f6' }}>
                                <td style={cellStyle}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <select value={lineItem.groupId} onChange={e => handleGroupChange(e.target.value)} className="soft-input" style={filterSelectStyle}>
                                            <option value="">Grup</option>{groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
                                        </select>
                                        <select value={lineItem.categoryId} onChange={e => handleCategoryChange(e.target.value)} className="soft-input" style={filterSelectStyle} disabled={!lineItem.groupId}>
                                            <option value="">Kat</option>{filteredCategories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                                        </select>
                                        <select value={selectedProductId} onChange={e => handleProductChange(e.target.value)} className="soft-input" style={{ ...selectStyle, flex: 1, fontWeight: 'bold' }} disabled={!lineItem.categoryId}>
                                            <option value="">Ürün Seç...</option>{filteredProducts.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                                        </select>
                                    </div>
                                </td>

                                <td style={cellStyle}>
                                    <select value={selectedColorId} onChange={e => handleColorChange(e.target.value)} className="soft-input" style={selectStyle} disabled={!selectedProductId}>
                                        <option value="">Seç</option>{allColors.map(c => <option key={c.id} value={c.id}>{c.colorName}</option>)}
                                    </select>
                                </td>
                                <td style={cellStyle}>
                                    <select value={selectedDimensionId} onChange={e => handleDimensionChange(e.target.value)} className="soft-input" style={selectStyle} disabled={!selectedColorId}>
                                        <option value="">Seç</option>{allDimensions.map(d => <option key={d.id} value={d.id}>{d.dimensionName}</option>)}
                                    </select>
                                </td>
                                <td style={cellStyle}>
                                    <select name="cushionId" value={lineItem.cushionId} onChange={handleLineChange} className="soft-input" style={selectStyle}>
                                        <option value="">Yok</option>{cushions.map(c => <option key={c.id} value={c.id}>{c.cushionName}</option>)}
                                    </select>
                                </td>
                                <td style={cellStyle}>
                                    <input type="number" ref={quantityInputRef} name="quantity" value={lineItem.quantity} onChange={handleLineChange} className="soft-input" style={{ ...smallInput, fontWeight: 'bold' }} />
                                </td>
                                <td style={cellStyle}>
                                    <input type="number" name="price" value={lineItem.price} onChange={handleLineChange} className="soft-input" style={mediumInput} />
                                </td>
                                <td style={cellStyle}>
                                    <select name="supplyMethod" value={lineItem.supplyMethod} onChange={handleLineChange} className="soft-input" style={{ ...selectStyle, fontSize: '11px', fontWeight: 'bold', color: lineItem.supplyMethod === 'Stoktan' ? '#16a34a' : '#dc2626' }}>
                                        <option value="Stoktan">Depo</option>
                                        <option value="Merkezden">Merkez</option>
                                    </select>
                                </td>
                                <td style={{ ...cellStyle, textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                                    {selectedProductId && selectedColorId ? (
                                        <>
                                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{currentFreeStock}</div>
                                            {currentFreeStock < requestedQty && <div style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '10px' }}>Yetersiz</div>}
                                        </>
                                    ) : "-"}
                                </td>
                                <td style={cellStyle}></td>
                            </tr>

                            {/* --- GİRİŞ SATIRI 2 (ÜRÜN NOTU) --- */}
                            <tr style={{ backgroundColor: getStockStatusColor(), borderBottom: '2px solid #3b82f6' }}>
                                <td colSpan={8} style={{ padding: '0 6px 6px 6px' }}>
                                    <input
                                        type="text"
                                        name="productNote"
                                        value={lineItem.productNote}
                                        onChange={handleLineChange}
                                        className="soft-input"
                                        style={{ width: '100%', height: '32px', fontSize: '12px', fontStyle: 'italic', color: '#64748b' }}
                                        placeholder="Ürün Notu (Varsa)..."
                                        onKeyDown={e => e.key === 'Enter' && addLineItem()}
                                    />
                                </td>
                                <td style={{ padding: '0 6px 6px 0', verticalAlign: 'top' }}>
                                    <button onClick={addLineItem} className="modern-btn btn-primary" style={{ padding: '0', width: '100%', height: '32px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                </td>
                            </tr>

                            {/* --- SEPET LİSTESİ --- */}
                            {addedItems.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>

                                    {/* 1. SÜTUN: Ürün Bilgisi + Ebat + Kategori (YAN YANA) */}
                                    <td style={{ padding: '10px 12px' }}>
                                        <div>
                                            <span style={{ fontWeight: 'bold', color: '#333', marginRight: '5px' }}>
                                                {item.productName.split('-')[0].trim()}
                                            </span>
                                            {item.dimensionId && (
                                                <span style={{ color: '#d35400', fontWeight: '600', marginRight: '5px' }}>
                                                    {getName(allDimensions, item.dimensionId, 'dimensionName')}
                                                </span>
                                            )}
                                            <span style={{ fontSize: '12px', color: '#7f8c8d' }}>
                                                ({getName(allCategories, item.categoryId, 'categoryName')})
                                            </span>
                                        </div>
                                        {item.productNote && (
                                            <div style={{ fontSize: '11px', color: '#e74c3c', fontStyle: 'italic', marginTop: '2px' }}>
                                                ↳ {item.productNote}
                                            </div>
                                        )}
                                    </td>

                                    {/* 2. SÜTUN: Renk */}
                                    <td style={{ padding: '10px 12px', fontSize: '13px', color: '#475569' }}>
                                        {getName(allColors, item.colorId, 'colorName')}
                                    </td>

                                    {/* 3. SÜTUN: Ebat (Boş bırakıyoruz çünkü ilk sütunda yazıyor) */}
                                    <td style={{ textAlign: 'center', color: '#ccc' }}>-</td>

                                    {/* 4. SÜTUN: Minder */}
                                    <td style={{ padding: '10px 12px', fontSize: '13px', color: '#475569' }}>
                                        {item.cushionId ? getName(cushions, item.cushionId, 'cushionName') : '-'}
                                    </td>

                                    {/* Diğer Sütunlar */}
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', padding: '10px' }}>{item.quantity}</td>
                                    <td style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{item.price} ₺</td>
                                    <td><span className={`status-badge ${item.supplyMethod === 'Stoktan' ? 'success' : 'danger'}`} style={{ fontSize: '10px' }}>{item.supplyMethod}</span></td>
                                    <td>-</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button onClick={() => { const n = [...addedItems]; n.splice(idx, 1); setAddedItems(n) }} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>×</button>
                                    </td>
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