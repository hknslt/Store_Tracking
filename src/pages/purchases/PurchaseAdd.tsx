// src/pages/purchases/PurchaseAdd.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { addPurchase, getPendingRequests, deletePendingRequests } from "../../services/purchaseService";
import { getStores } from "../../services/storeService";
import { getGroups, getCategoriesByGroupId, getCushions, getColors, getDimensions } from "../../services/definitionService";
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
    const [categories, setCategories] = useState<Category[]>([]);
    const [productsInCat, setProductsInCat] = useState<Product[]>([]);
    const [allColors, setAllColors] = useState<Color[]>([]);
    const [allDimensions, setAllDimensions] = useState<Dimension[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);

    const [currentUserData, setCurrentUserData] = useState<SystemUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // --- BEKLEYEN TALEPLER ---
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    // Silinenleri geri yüklemek için geçici hafıza (Sepetteki item ile request eşleşmesi için)
    // Sepete eklenen her item'a 'requestId' ekleyeceğiz.

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

    const [addedItems, setAddedItems] = useState<(PurchaseItem & { requestId?: string })[]>([]); // requestId eklendi
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);

    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // --- YARDIMCILAR ---
    const getName = (list: any[], id: string | null | undefined, key: string) => list.find(x => x.id === id)?.[key] || "-";

    // --- BAŞLANGIÇ ---
    useEffect(() => {
        const init = async () => {
            const [g, c, col, dim] = await Promise.all([getGroups(), getCushions(), getColors(), getDimensions()]);
            setGroups(g); setCushions(c); setAllColors(col); setAllDimensions(dim);

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

    // --- TALEPLERİ ÇEK ---
    useEffect(() => {
        if (headerData.storeId) {
            getPendingRequests(headerData.storeId).then(data => {
                // Sepette zaten ekli olanları filtrele
                const alreadyAddedIds = addedItems.map(i => i.requestId).filter(Boolean);
                setPendingRequests(data.filter(req => !alreadyAddedIds.includes(req.id)));
            });
        } else {
            setPendingRequests([]);
        }
    }, [headerData.storeId, addedItems.length]); // addedItems değişince yeniden hesapla demiyoruz, sadece ilk yüklemede ve mağaza değişiminde.
    // Ancak sepete ekleme/çıkarma fonksiyonlarında manuel state güncelleyeceğiz.

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
        const newItem: PurchaseItem & { requestId?: string } = {
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
            itemType: 'Sipariş',
            requestId: req.id // Bu ID sayesinde geri yükleyebileceğiz
        };

        setAddedItems([...addedItems, newItem]);
        // Listeden çıkar
        setPendingRequests(prev => prev.filter(p => p.id !== req.id));
    };

    const removeAddedItem = (index: number) => {
        const itemToRemove = addedItems[index];
        
        // Eğer bu item bir talep ise, talepler listesine geri ekle
        if (itemToRemove.requestId) {
            // Veritabanından tekrar çekmek yerine, item bilgisinden request oluşturup ekleyebiliriz veya
            // En temizi: veritabanından tekrar çekip, sepette OLMAYANLARI filtrelemektir.
            // Ama performans için manuel ekleyelim.
            // Ancak request objesinin tamamı elimizde yok (müşteri adı vs). 
            // O yüzden en sağlıklısı: getPendingRequests tekrar çağrılır.
            
            const newItems = [...addedItems];
            newItems.splice(index, 1);
            setAddedItems(newItems);

            // Bekleyenleri güncelle (Burası biraz trickli, state hemen güncellenmezse diye)
            // En garantisi: state güncellendikten sonra listeyi tazelemek.
            // Ama React state asenkron olduğu için, burada manuel filtreleme yapıp set edelim.
            
            // Basit çözüm: O anki pendingRequests listesine, silineni geri koyamayız çünkü data eksik.
            // O yüzden veritabanından taze çekip, kalan sepettekileri çıkaracağız.
            getPendingRequests(headerData.storeId).then(allReqs => {
                const remainingIds = newItems.map(i => i.requestId).filter(Boolean);
                setPendingRequests(allReqs.filter(req => !remainingIds.includes(req.id)));
            });

        } else {
            // Normal stok girişi ise direkt sil
            const newItems = [...addedItems];
            newItems.splice(index, 1);
            setAddedItems(newItems);
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
            items: addedItems, // requestId alanı veritabanına kaydedilirken sorun olmaz, fazlalık alanlar ignore edilir veya kaydedilir.
            totalAmount: addedItems.reduce((sum, item) => sum + Number(item.amount), 0),
            createdAt: new Date()
        };

        // Tamamlanan taleplerin ID'lerini topla
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
    const filterSelectStyle = { width: '90px', padding: '6px', fontSize: '11px', marginRight:'4px' };

    return (
        <div className="page-container">
            {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

            <div className="modern-header">
                <div>
                    <h2>Alış / Stok Giriş</h2>
                    <p>Depoya yeni ürün girişi veya sipariş karşılama</p>
                </div>
                <div style={{display:'flex', gap:'10px'}}>
                    <Link to="/purchases" className="modern-btn btn-secondary">İptal</Link>
                    {addedItems.length > 0 && 
                        <button onClick={saveReceipt} className="modern-btn btn-primary">
                            KAYDET ({addedItems.reduce((a, b) => a + Number(b.amount), 0).toFixed(2)} ₺)
                        </button>
                    }
                </div>
            </div>

            {/* --- FİŞ BİLGİLERİ (KOMPAKT) --- */}
            <div className="filter-bar" style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'15px'}}>
                <div>
                    <label className="form-label">Tarih</label>
                    <input type="date" name="date" value={headerData.date} onChange={handleHeaderChange} className="soft-input" />
                </div>
                <div>
                    <label className="form-label">Mağaza</label>
                    {isAdmin ? 
                        <select name="storeId" value={headerData.storeId} onChange={handleHeaderChange} className="soft-input">
                            <option value="">Seç...</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                        </select> 
                        : <input disabled value="Mağazam" className="soft-input" style={{backgroundColor:'#f1f5f9'}} />
                    }
                </div>
                <div>
                    <label className="form-label">Fiş No <span style={{ color: 'red' }}>*</span></label>
                    <input name="receiptNo" value={headerData.receiptNo} onChange={handleHeaderChange} className="soft-input" placeholder="Örn: IRS-2024-001" />
                </div>
            </div>

            {/* --- MANUEL ÜRÜN EKLEME --- */}
            <div className="card">
                <div className="card-header" style={{padding:'15px 20px', borderBottom:'1px solid #eee'}}>
                    <h3 style={{margin:0, fontSize:'16px', color:'#2c3e50'}}>Manuel Ürün Ekle</h3>
                </div>
                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                    <table className="modern-table dense">
                        <thead style={{ backgroundColor: '#f8fafc' }}>
                            <tr>
                                <th style={{ width: '30%' }}>Ürün (Grup - Kat - Ad)</th>
                                <th style={{ width: '12%' }}>Renk</th>
                                <th style={{ width: '12%' }}>Ebat</th>
                                <th style={{ width: '12%' }}>Minder</th>
                                <th style={{ width: '6%', textAlign:'center' }}>Adet</th>
                                <th style={{ width: '10%' }}>Tutar</th>
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
                                    <input type="number" name="amount" value={lineItem.amount} onChange={handleLineChange} className="soft-input" style={mediumInput} />
                                </td>
                                <td style={cellStyle}>
                                    <input type="text" name="explanation" value={lineItem.explanation} onChange={handleLineChange} className="soft-input" style={{width:'100%', padding:'6px', fontSize:'12px'}} onKeyDown={e => e.key === 'Enter' && addLineItem()} />
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
                <div className="card" style={{ marginTop: '25px', overflow:'hidden' }}>
                    <div className="card-header" style={{ backgroundColor: '#f1f5f9', borderBottom:'1px solid #e2e8f0', padding:'15px 20px' }}>
                        <h3 style={{margin:0, fontSize:'16px', color:'#334155'}}>🛒 Fişe Eklenecek Ürünler ({addedItems.length})</h3>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="modern-table">
                            <thead>
                                <tr style={{backgroundColor:'#f8fafc', borderBottom:'1px solid #e2e8f0'}}>
                                    <th style={{width:'30%'}}>Ürün Bilgisi</th>
                                    <th style={{width:'12%'}}>Renk</th>
                                    <th style={{width:'12%'}}>Minder</th>
                                    <th style={{textAlign:'center', width:'8%'}}>Miktar</th>
                                    <th style={{textAlign:'right', width:'10%'}}>Tutar</th>
                                    <th style={{width:'20%'}}>Açıklama</th>
                                    <th style={{width:'5%'}}>Sil</th>
                                </tr>
                            </thead>
                            <tbody>
                                {addedItems.map((item, idx) => (
                                    <tr key={idx} style={{borderBottom:'1px solid #e2e8f0'}}>
                                        
                                        {/* ÜRÜN BİLGİSİ (BİRLEŞİK) */}
                                        <td style={{padding:'10px 15px'}}>
                                            <div>
                                                <span style={{fontWeight:'600', color:'#1e293b', marginRight:'6px'}}>
                                                    {item.productName.split('-')[0].trim()}
                                                </span>
                                                {item.dimensionId && (
                                                    <span style={{color:'#e67e22', fontWeight:'600', marginRight:'6px'}}>
                                                        {getName(allDimensions, item.dimensionId, 'dimensionName')}
                                                    </span>
                                                )}
                                                <span style={{fontSize:'12px', color:'#64748b'}}>
                                                    ({getName(categories, item.categoryId, 'categoryName')})
                                                </span>
                                            </div>
                                        </td>

                                        <td style={{padding:'10px 15px', color:'#475569'}}>{getName(allColors, item.colorId, 'colorName')}</td>
                                        <td style={{padding:'10px 15px', color:'#475569'}}>{item.cushionId ? getName(cushions, item.cushionId, 'cushionName') : '-'}</td>
                                        <td style={{textAlign:'center', fontWeight:'bold', fontSize:'14px', padding:'10px 15px'}}>{item.quantity}</td>
                                        <td style={{textAlign:'right', fontWeight:'600', color:'#166534', padding:'10px 15px'}}>{Number(item.amount).toFixed(2)} ₺</td>
                                        <td style={{padding:'10px 15px', color:'#64748b', fontSize:'12px', fontStyle:'italic'}}>{item.explanation}</td>
                                        <td style={{textAlign:'center', padding:'10px 15px'}}>
                                            <button onClick={() => removeAddedItem(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', fontWeight:'bold' }}>×</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- BEKLEYEN TALEPLER (İSTENEN FORMAT) --- */}
            {pendingRequests.length > 0 && (
                <div className="card" style={{ marginTop: '25px', border: '2px solid #f59e0b' }}>
                    <div className="card-header" style={{ backgroundColor: '#fff7ed', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding:'15px 20px' }}>
                        <h3 style={{ color: '#b45309', margin: 0, fontSize:'16px' }}>⏳ Satışlardan Gelen Bekleyen Talepler</h3>
                        <span className="status-badge warning">{pendingRequests.length} Adet</span>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="modern-table">
                            <thead>
                                <tr style={{backgroundColor:'#fff7ed'}}>
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
                                    <tr key={req.id} style={{borderBottom:'1px solid #fed7aa'}}>
                                        <td style={{ fontWeight: 'bold', color:'#b45309', padding:'10px 15px' }}>{req.saleReceiptNo}</td>
                                        <td style={{padding:'10px 15px'}}>{req.customerName}</td>
                                        
                                        {/* ÜRÜN BİLGİSİ (BİRLEŞİK) */}
                                        <td style={{padding:'10px 15px'}}>
                                            <span style={{fontWeight:'600', marginRight:'5px'}}>{req.productName.split('-')[0]}</span>
                                            {req.dimensionId && <span style={{color:'#d35400', marginRight:'5px'}}>{getName(allDimensions, req.dimensionId, 'dimensionName')}</span>}
                                            <span style={{fontSize:'11px', color:'#777'}}>({getName(categories, req.categoryId, 'categoryName')})</span>
                                        </td>

                                        <td style={{padding:'10px 15px'}}>{getName(allColors, req.colorId, 'colorName')}</td>
                                        <td style={{padding:'10px 15px'}}>{req.cushionId ? getName(cushions, req.cushionId, 'cushionName') : '-'}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold', padding:'10px 15px' }}>{req.quantity}</td>
                                        <td style={{padding:'10px 15px', fontSize:'11px', fontStyle:'italic', color:'#666'}}>{req.productNote || "-"}</td>
                                        <td style={{padding:'10px 15px'}}>
                                            <button onClick={() => addRequestToReceipt(req)} className="modern-btn btn-secondary" style={{ width: '100%', fontSize: '11px', padding: '6px' }}>
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
        