// src/pages/purchases/PurchaseAdd.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import {
    addPurchase,
    getPendingRequests,
    deletePendingRequests,
    getNextPurchaseReceiptNo
} from "../../services/purchaseService";
import { getStores } from "../../services/storeService";
import { getGroups, getCategoriesByGroupId, getCushions, getColors, getDimensions, getCategories } from "../../services/definitionService";
import { getProductsByCategoryId } from "../../services/productService";
import { useNavigate, Link } from "react-router-dom";

import type { Purchase, PurchaseItem, Store, SystemUser, Group, Category, Product, Color, Dimension, Cushion, PendingRequest } from "../../types";
import "../../App.css";

const PurchaseAdd = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // --- LİSTELER ---
    const [stores, setStores] = useState<Store[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]); // Filtrelenmiş kategoriler
    const [allCategories, setAllCategories] = useState<Category[]>([]); // 🔥 TÜM KATEGORİLER (İsimlendirme için)
    const [productsInCat, setProductsInCat] = useState<Product[]>([]);
    const [allColors, setAllColors] = useState<Color[]>([]);
    const [allDimensions, setAllDimensions] = useState<Dimension[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);

    const [currentUserData, setCurrentUserData] = useState<SystemUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // --- BEKLEYEN TALEPLER ---
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

    // --- BAŞLIK STATE ---
    const [headerData, setHeaderData] = useState({
        date: new Date().toISOString().split('T')[0],
        receiptNo: "",
        storeId: ""
    });

    // --- SATIR STATE (MANUEL) ---
    const [selectedProductId, setSelectedProductId] = useState("");
    const [selectedColorId, setSelectedColorId] = useState("");
    const [selectedDimensionId, setSelectedDimensionId] = useState("");

    // 🔥 DÜZENLEME: Burada 'unitPrice' tutacağız, 'amount' (toplam) hesaplanacak.
    const [unitPrice, setUnitPrice] = useState<number | string>("");
    const [lineItem, setLineItem] = useState<Partial<PurchaseItem>>({
        groupId: "", categoryId: "", productId: "", productName: "", colorId: "", cushionId: "", dimensionId: null,
        quantity: 1, explanation: "", status: 'Beklemede'
    });

    const [addedItems, setAddedItems] = useState<(PurchaseItem & { requestId?: string })[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);

    // --- MODAL STATE (Talep Fiyatı İçin) ---
    const [requestModal, setRequestModal] = useState<{ show: boolean, req: PendingRequest | null, price: number }>({
        show: false, req: null, price: 0
    });

    // Toast Mesaj
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
    };

    // --- YARDIMCILAR ---
    const getName = (list: any[], id: string | null | undefined, key: string) => list.find(x => x.id === id)?.[key] || "-";

    // --- BAŞLANGIÇ ---
    useEffect(() => {
        const init = async () => {
            // 🔥 'getCategories' ile tüm kategorileri çekiyoruz
            const [g, c, col, dim, cats] = await Promise.all([
                getGroups(), getCushions(), getColors(), getDimensions(), getCategories()
            ]);
            setGroups(g); setCushions(c); setAllColors(col); setAllDimensions(dim);
            setAllCategories(cats); // 🔥 State'e atıyoruz

            if (currentUser) {
                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    const u = userDoc.data() as SystemUser;
                    setCurrentUserData(u);

                    if (['admin', 'control', 'report'].includes(u.role)) {
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

    // --- MAĞAZA DEĞİŞİNCE YAPILACAKLAR ---
    useEffect(() => {
        if (headerData.storeId) {
            // Bekleyen talepleri çek (sepetten bağımsız olarak)
            getPendingRequests(headerData.storeId).then(data => {
                // Burada mevcut eklenenleri ayıklamak için ayrı bir kontrol yapabilirsiniz, 
                // ama genelde sayfa ilk açıldığında sıfırdan çekmesi yeterlidir.
                const alreadyAddedIds = addedItems.map(i => i.requestId).filter(Boolean);
                setPendingRequests(data.filter(req => !alreadyAddedIds.includes(req.id)));
            });

            // SADECE mağaza değiştiğinde/seçildiğinde fiş numarasını OTOMATİK al.
            getNextPurchaseReceiptNo(headerData.storeId).then(nextNo => {
                setHeaderData(prev => ({ ...prev, receiptNo: nextNo }));
            });

        } else {
            setPendingRequests([]);
            setHeaderData(prev => ({ ...prev, receiptNo: "" }));
        }
        // 🔥 DİKKAT: 'addedItems.length' buradan kaldırıldı. Böylece ürün eklenince Fiş No ezilmez.
        // Sadece headerData.storeId değiştiğinde çalışır.
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const p = productsInCat.find(x => x.id === pid);
        if (p) {
            setLineItem(prev => ({ ...prev, productId: pid, colorId: cid, dimensionId: did || null, productName: p.productName }));
        }
    };

    // --- MANUEL EKLEME ---
    const addLineItem = () => {
        if (!lineItem.productId || !selectedColorId || !lineItem.quantity) {
            showToast('error', "Ürün ve Renk seçimi zorunludur."); return;
        }

        const qty = Number(lineItem.quantity);
        const uPrice = Number(unitPrice);

        // 🔥 HESAPLAMA: Toplam Tutar = Birim Fiyat * Adet
        const totalAmount = uPrice * qty;

        const newItem: PurchaseItem = {
            ...(lineItem as PurchaseItem),
            amount: totalAmount, // Veritabanına toplam tutar kaydedilir
            itemType: 'Stok',
            status: 'Beklemede'
        };

        setAddedItems([...addedItems, newItem]);

        // Formu temizle
        setLineItem(prev => ({ ...prev, cushionId: "", quantity: 1, explanation: "", productId: "", productName: "", colorId: "", dimensionId: null }));
        setUnitPrice(""); // Fiyatı temizle
        setSelectedProductId(""); setSelectedColorId(""); setSelectedDimensionId("");
    };

    // --- TALEP EKLEME SÜRECİ ---
    const openRequestModal = (req: PendingRequest) => {
        setRequestModal({ show: true, req, price: 0 }); // Modal açılırken fiyat 0 (Buradaki price: Birim Fiyat olacak)
    };

    const confirmRequestAdd = () => {
        const { req, price } = requestModal;
        if (!req) return;

        // 🔥 HESAPLAMA: Modalda girilen "Birim Fiyat" * Adet
        const totalAmount = Number(price) * req.quantity;

        const newItem: PurchaseItem & { requestId?: string } = {
            groupId: req.groupId,
            categoryId: req.categoryId,
            productId: req.productId,
            productName: req.productName,
            colorId: req.colorId,
            cushionId: req.cushionId,
            dimensionId: req.dimensionId,
            quantity: req.quantity,
            amount: totalAmount, // Toplam Tutar
            explanation: req.productNote || "",
            status: 'Beklemede',
            itemType: 'Sipariş',
            requestId: req.id
        };

        setAddedItems([...addedItems, newItem]);
        setPendingRequests(prev => prev.filter(p => p.id !== req.id));
        setRequestModal({ show: false, req: null, price: 0 });
    };

    const removeAddedItem = (index: number) => {
        const itemToRemove = addedItems[index];
        const newItems = [...addedItems];
        newItems.splice(index, 1);
        setAddedItems(newItems);

        if (itemToRemove.requestId) {
            getPendingRequests(headerData.storeId).then(allReqs => {
                const remainingIds = newItems.map(i => i.requestId).filter(Boolean);
                setPendingRequests(allReqs.filter(req => !remainingIds.includes(req.id)));
            });
        }
    };

    const saveReceipt = async () => {
        if (!headerData.storeId) return showToast('error', "Mağaza seçimi zorunludur!");
        if (addedItems.length === 0) return showToast('error', "Ürün ekleyiniz.");
        if (!headerData.receiptNo.trim()) return showToast('error', "Lütfen Fiş No giriniz!");

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

        const completedRequestIds = addedItems.map(i => i.requestId).filter(id => id !== undefined) as string[];

        try {
            await addPurchase(purchaseData);
            if (completedRequestIds.length > 0) {
                await deletePendingRequests(headerData.storeId, completedRequestIds);
            }
            showToast('success', "Alış Fişi Kaydedildi!");
            setTimeout(() => navigate('/purchases'), 1000);
        } catch (error: any) {
            showToast('error', error.message);
        }
    };

    // Stiller
    const cellStyle = { padding: '6px', verticalAlign: 'middle' };
    const smallInput = { width: '50px', padding: '6px', fontSize: '13px', textAlign: 'center' as const };
    const mediumInput = { width: '70px', padding: '6px', fontSize: '13px' };
    const selectStyle = { width: '100%', padding: '6px', fontSize: '12px' };
    const filterSelectStyle = { width: '90px', padding: '6px', fontSize: '11px', marginRight: '4px' };

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

            {/* --- FİYAT GİRİŞ MODALI (TALEPLER İÇİN) --- */}
            {requestModal.show && requestModal.req && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '350px' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                            💰 Alış Fiyatı Giriniz
                        </h3>
                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>
                                <strong>Ürün:</strong> {requestModal.req.productName}
                            </div>
                            <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
                                <strong>Adet:</strong> {requestModal.req.quantity}
                            </div>

                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>Birim Fiyat (TL)</label>
                            <input
                                type="number"
                                autoFocus
                                className="form-input"
                                value={requestModal.price}
                                onChange={e => setRequestModal({ ...requestModal, price: Number(e.target.value) })}
                                onKeyDown={e => e.key === 'Enter' && confirmRequestAdd()}
                            />
                            <div style={{ marginTop: '5px', fontSize: '12px', color: '#16a34a' }}>
                                Toplam: {(requestModal.req.quantity * requestModal.price).toFixed(2)} ₺
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setRequestModal({ show: false, req: null, price: 0 })} className="btn btn-secondary">İptal</button>
                            <button onClick={confirmRequestAdd} className="btn btn-primary">Ekle</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="modern-header">
                <div>
                    <h2>Alış / Stok Giriş</h2>
                    <p>Depo Stok Girişleri ve Sipariş Tedarikleri</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link to="/purchases" className="modern-btn btn-secondary">İptal</Link>
                    {addedItems.length > 0 &&
                        <button onClick={saveReceipt} className="modern-btn btn-primary">
                            KAYDET ({addedItems.reduce((a, b) => a + Number(b.amount), 0).toFixed(2)} ₺)
                        </button>
                    }
                </div>
            </div>

            {/* --- FİŞ BİLGİLERİ --- */}
            <div className="filter-bar" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div>
                    <label className="form-label">
                        Tarih {isAdmin && <span style={{ fontSize: '10px', color: 'green' }}>(Admin)</span>}
                    </label>
                    <input
                        type="date"
                        name="date"
                        value={headerData.date}
                        onChange={handleHeaderChange}
                        className="soft-input"
                        disabled={!isAdmin}
                        style={{ backgroundColor: !isAdmin ? '#f1f5f9' : 'white' }}
                    />
                </div>
                <div>
                    <label className="form-label">Mağaza</label>
                    {isAdmin ?
                        <select name="storeId" value={headerData.storeId} onChange={handleHeaderChange} className="soft-input">
                            <option value="">Seç...</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                        </select>
                        : <input disabled value="Mağazam" className="soft-input" style={{ backgroundColor: '#f1f5f9' }} />
                    }
                </div>
                <div>
                    <label className="form-label">Fiş No <span style={{ color: 'red' }}>*</span></label>
                    <input
                        name="receiptNo"
                        value={headerData.receiptNo}
                        onChange={handleHeaderChange}
                        className="soft-input"
                        placeholder="Otomatik..."
                    />
                </div>
            </div>

            {/* --- MANUEL ÜRÜN EKLEME --- */}
            <div className="card">
                <div className="card-header" style={{ padding: '15px 20px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#2c3e50' }}>Manuel Ürün Ekle</h3>
                </div>
                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                    <table className="modern-table dense">
                        <thead style={{ backgroundColor: '#f8fafc' }}>
                            <tr>
                                <th style={{ width: '30%' }}>Ürün (Grup - Kat - Ad)</th>
                                <th style={{ width: '12%' }}>Renk</th>
                                <th style={{ width: '12%' }}>Ebat</th>
                                <th style={{ width: '12%' }}>Minder</th>
                                <th style={{ width: '6%', textAlign: 'center' }}>Adet</th>
                                <th style={{ width: '10%' }}>Birim Fiyat</th>
                                <th style={{ width: '13%' }}>Açıklama</th>
                                <th style={{ width: '5%' }}>+</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={cellStyle}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <select value={lineItem.groupId} onChange={e => handleGroupChange(e.target.value)} className="soft-input" style={filterSelectStyle}>
                                            <option value="">Grup</option>{groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
                                        </select>
                                        <select value={lineItem.categoryId} onChange={e => handleCategoryChange(e.target.value)} className="soft-input" style={filterSelectStyle} disabled={!lineItem.groupId}>
                                            <option value="">Kat</option>{categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                                        </select>
                                        <select value={selectedProductId} onChange={e => handleProductChange(e.target.value)} className="soft-input" style={{ ...selectStyle, flex: 1, fontWeight: 'bold' }} disabled={!lineItem.categoryId}>
                                            <option value="">Ürün Seç...</option>{productsInCat.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
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
                                    <input
                                        type="number"
                                        value={unitPrice}
                                        onChange={e => setUnitPrice(e.target.value)}
                                        className="soft-input"
                                        style={mediumInput}
                                        placeholder="Birim ₺"
                                    />
                                </td>
                                <td style={cellStyle}>
                                    <input type="text" name="explanation" value={lineItem.explanation} onChange={handleLineChange} className="soft-input" style={{ width: '100%', padding: '6px', fontSize: '12px' }} onKeyDown={e => e.key === 'Enter' && addLineItem()} />
                                </td>
                                <td style={cellStyle}>
                                    <button onClick={addLineItem} className="modern-btn btn-primary" style={{ padding: '0', width: '100%', height: '32px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- SEPET LİSTESİ --- */}
            {addedItems.length > 0 && (
                <div className="card" style={{ marginTop: '25px', overflow: 'hidden' }}>
                    <div className="card-header" style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', padding: '15px 20px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>🛒 Fişe Eklenecek Ürünler ({addedItems.length})</h3>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="modern-table">
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ width: '30%' }}>Ürün Bilgisi</th>
                                    <th style={{ width: '12%' }}>Renk</th>
                                    <th style={{ width: '12%' }}>Minder</th>
                                    <th style={{ textAlign: 'center', width: '8%' }}>Miktar</th>
                                    <th style={{ textAlign: 'right', width: '10%' }}>Birim Fiyat</th>
                                    <th style={{ textAlign: 'right', width: '10%' }}>Toplam</th>
                                    <th style={{ width: '20%' }}>Açıklama</th>
                                    <th style={{ width: '5%' }}>Sil</th>
                                </tr>
                            </thead>
                            <tbody>
                                {addedItems.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '10px 15px' }}>
                                            <div>
                                                <span style={{ fontWeight: '600', color: '#1e293b', marginRight: '6px' }}>
                                                    {item.productName.split('-')[0].trim()}
                                                </span>
                                                {item.dimensionId && (
                                                    <span style={{ color: '#e67e22', fontWeight: '600', marginRight: '6px' }}>
                                                        {getName(allDimensions, item.dimensionId, 'dimensionName')}
                                                    </span>
                                                )}
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                    ({getName(allCategories, item.categoryId, 'categoryName')})
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 15px', color: '#475569' }}>{getName(allColors, item.colorId, 'colorName')}</td>
                                        <td style={{ padding: '10px 15px', color: '#475569' }}>{item.cushionId ? getName(cushions, item.cushionId, 'cushionName') : '-'}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', padding: '10px 15px' }}>{item.quantity}</td>

                                        {/* Birim Fiyat Gösterimi */}
                                        <td style={{ textAlign: 'right', color: '#1e293b', padding: '10px 15px' }}>
                                            {Number(item.amount / item.quantity).toFixed(2)} ₺
                                        </td>

                                        {/* Toplam Tutar */}
                                        <td style={{ textAlign: 'right', fontWeight: '600', color: '#166534', padding: '10px 15px' }}>
                                            {Number(item.amount).toFixed(2)} ₺
                                        </td>

                                        <td style={{ padding: '10px 15px', color: '#64748b', fontSize: '12px', fontStyle: 'italic' }}>{item.explanation}</td>
                                        <td style={{ textAlign: 'center', padding: '10px 15px' }}>
                                            <button onClick={() => removeAddedItem(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>×</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- BEKLEYEN TALEPLER --- */}
            {pendingRequests.length > 0 && (
                <div className="card" style={{ marginTop: '25px', border: '2px solid #f59e0b' }}>
                    <div className="card-header" style={{ backgroundColor: '#fff7ed', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px' }}>
                        <h3 style={{ color: '#b45309', margin: 0, fontSize: '16px' }}>⏳ Satışlardan Gelen Bekleyen Talepler</h3>
                        <span className="status-badge warning">{pendingRequests.length} Adet</span>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="modern-table">
                            <thead>
                                <tr style={{ backgroundColor: '#fff7ed' }}>
                                    <th style={{ width: '12%' }}>Sipariş No</th>
                                    <th style={{ width: '15%' }}>Müşteri</th>
                                    <th style={{ width: '25%' }}>Ürün</th>
                                    <th style={{ width: '10%' }}>Renk</th>
                                    <th style={{ width: '10%' }}>Minder</th>
                                    <th style={{ width: '5%', textAlign: 'center' }}>Adet</th>
                                    <th style={{ width: '15%' }}>Not</th>
                                    <th style={{ width: '8%' }}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingRequests.map(req => (
                                    <tr key={req.id} style={{ borderBottom: '1px solid #fed7aa' }}>
                                        <td style={{ fontWeight: 'bold', color: '#b45309', padding: '10px 15px' }}>{req.saleReceiptNo}</td>
                                        <td style={{ padding: '10px 15px' }}>{req.customerName}</td>
                                        <td style={{ padding: '10px 15px' }}>
                                            <span style={{ fontWeight: '600', marginRight: '5px' }}>{req.productName.split('-')[0]}</span>
                                            {req.dimensionId && <span style={{ color: '#d35400', marginRight: '5px' }}>{getName(allDimensions, req.dimensionId, 'dimensionName')}</span>}
                                            <span style={{ fontSize: '11px', color: '#777' }}>({getName(allCategories, req.categoryId, 'categoryName')})</span>
                                        </td>
                                        <td style={{ padding: '10px 15px' }}>{getName(allColors, req.colorId, 'colorName')}</td>
                                        <td style={{ padding: '10px 15px' }}>{req.cushionId ? getName(cushions, req.cushionId, 'cushionName') : '-'}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '10px 15px' }}>{req.quantity}</td>
                                        <td style={{ padding: '10px 15px', fontSize: '11px', fontStyle: 'italic', color: '#666' }}>{req.productNote || "-"}</td>
                                        <td style={{ padding: '10px 15px' }}>
                                            <button onClick={() => openRequestModal(req)} className="modern-btn btn-secondary" style={{ width: '100%', fontSize: '11px', padding: '6px' }}>
                                                ⬇️ Ekle
                                            </button>
                                        </td>
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