// src/pages/sales/SaleEdit.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { updateSale } from "../../services/saleService"; // Yeni servis
import { getPersonnelByStore } from "../../services/storeService";
import { getStoreStocks } from "../../services/storeStockService";
import { getGroups, getCategories, getCushions, getColors, getDimensions } from "../../services/definitionService";
import { getProducts } from "../../services/productService";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { iller } from "../../constants/cities";
import type { Sale, SaleItem, StoreStock, Personnel, Category, Product, Cushion, Color, Dimension, SystemUser } from "../../types";
import "../../App.css";

const SaleEdit = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { id, storeId } = useParams(); // URL'den parametreleri al (Router ayarına göre değişir)
    const location = useLocation(); // State'den veriyi al (varsa)

    const [loading, setLoading] = useState(true);

    // Veriler
    const [groups, setGroups] = useState<any[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [allColors, setAllColors] = useState<Color[]>([]);
    const [allDimensions, setAllDimensions] = useState<Dimension[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);
    const [storeStocks, setStoreStocks] = useState<StoreStock[]>([]);
    const [storePersonnel, setStorePersonnel] = useState<Personnel[]>([]);
    const [districts, setDistricts] = useState<string[]>([]);

    // Header State
    const [headerData, setHeaderData] = useState<any>({});

    // Item Yönetimi
    const [originalItems, setOriginalItems] = useState<SaleItem[]>([]); // İlk yüklenen hali (Kıyaslama için)
    const [currentItems, setCurrentItems] = useState<SaleItem[]>([]);   // Şu anki hali

    // Yeni Satır Ekleme State'i
    const [lineItem, setLineItem] = useState<Partial<SaleItem>>({ quantity: 1, price: 0, supplyMethod: 'Stoktan' });
    const [selectedProductId, setSelectedProductId] = useState("");
    const [selectedColorId, setSelectedColorId] = useState("");
    const [selectedDimensionId, setSelectedDimensionId] = useState("");

    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);

    // --- BAŞLANGIÇ ---
    useEffect(() => {
        const init = async () => {
            try {
                // 1. Tanımları Yükle
                const [g, c, col, dim, cats, prods] = await Promise.all([
                    getGroups(), getCushions(), getColors(), getDimensions(), getCategories(), getProducts()
                ]);
                setGroups(g); setCushions(c); setAllColors(col); setAllDimensions(dim);
                setAllCategories(cats); setAllProducts(prods);

                // 2. Mevcut Satışı Yükle
                let saleData: Sale | null = location.state?.sale || null;

                // Eğer state yoksa (direkt linkten geldiyse) Firestore'dan çek
                if (!saleData && storeId && id) {
                    const docRef = doc(db, "sales", storeId, "receipts", id);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) saleData = { id: snap.id, ...snap.data() } as Sale;
                }

                if (saleData) {
                    // Header verilerini doldur
                    setHeaderData({
                        date: saleData.date,
                        receiptNo: saleData.receiptNo,
                        storeId: saleData.storeId,
                        personnelId: saleData.personnelId,
                        personnelName: saleData.personnelName,
                        customerName: saleData.customerName,
                        tc: saleData.tc || "",
                        email: saleData.email || "",
                        phone: saleData.phone || "",
                        city: saleData.city || "",
                        district: saleData.district || "",
                        address: saleData.address || "",
                        deadline: saleData.deadline,
                        shippingCost: saleData.shippingCost || 0,
                        explanation: saleData.explanation || ""
                    });

                    setOriginalItems(JSON.parse(JSON.stringify(saleData.items))); // Deep copy
                    setCurrentItems(saleData.items);

                    // Mağaza Stok ve Personelini Çek
                    if (saleData.storeId) {
                        getStoreStocks(saleData.storeId).then(setStoreStocks);
                        getPersonnelByStore(saleData.storeId).then(setStorePersonnel as any);
                    }

                    // Şehir seçiliyse ilçeleri yükle
                    if (saleData.city) {
                        const cityObj = iller.find(i => i.isim === saleData.city);
                        if (cityObj) setDistricts(cityObj.ilceler);
                    }
                }
            } catch (error) {
                console.error(error);
                setMessage({ type: 'error', text: "Veri yüklenemedi." });
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [id, storeId]);

    // --- YARDIMCILAR ---
    const getName = (list: any[], id: string | null | undefined, key: string) => list.find(x => x.id === id)?.[key] || "-";

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

    // --- İŞLEMLER ---

    // Header Değişiklikleri
    const handleHeaderChange = (e: any) => {
        const { name, value } = e.target;
        if (name === 'city') {
            const cityObj = iller.find(i => i.isim === value);
            setDistricts(cityObj ? cityObj.ilceler : []);
            setHeaderData({ ...headerData, city: value, district: "" });
        } else {
            setHeaderData({ ...headerData, [name]: value });
        }
    };

    const handleLineChange = (e: any) => setLineItem({ ...lineItem, [e.target.name]: e.target.value });

    // Yeni Ürün Seçim Zinciri
    const handleGroupChange = (groupId: string) => {
        setLineItem(prev => ({ ...prev, groupId, categoryId: "", productId: "" }));
        setFilteredCategories(allCategories.filter(c => c.groupId === groupId));
        setFilteredProducts([]);
    };
    const handleCategoryChange = (categoryId: string) => {
        setLineItem(prev => ({ ...prev, categoryId, productId: "" }));
        setFilteredProducts(allProducts.filter(p => p.categoryId === categoryId));
    };
    const handleProductChange = (val: string) => {
        setSelectedProductId(val);
        const p = allProducts.find(x => x.id === val);
        setLineItem(prev => ({ ...prev, productId: val, productName: p?.productName }));
    };

    const handleColorChange = (val: string) => setSelectedColorId(val);
    const handleDimensionChange = (val: string) => setSelectedDimensionId(val);

    // Stok Kontrolü ve Ekleme
    useEffect(() => {
        if (selectedProductId && selectedColorId) {
            setLineItem(prev => ({ ...prev, supplyMethod: currentFreeStock <= 0 ? 'Merkezden' : 'Stoktan' }));
        }
    }, [selectedProductId, selectedColorId, selectedDimensionId, currentFreeStock]);

    const addLineItem = () => {
        if (!lineItem.productId || !selectedColorId || !lineItem.quantity || !lineItem.price) {
            setMessage({ type: 'error', text: 'Eksik bilgi.' }); return;
        }
        const total = (Number(lineItem.price) - Number(lineItem.discount || 0)) * Number(lineItem.quantity);
        const newItem: SaleItem = {
            ...lineItem,
            colorId: selectedColorId,
            dimensionId: selectedDimensionId || null,
            total,
            status: 'Sipariş',
            deliveryStatus: 'Bekliyor'
        } as SaleItem;

        setCurrentItems([...currentItems, newItem]);

        // Formu temizle
        setLineItem({ quantity: 1, price: 0, discount: 0, productNote: "", supplyMethod: 'Stoktan' });
        setSelectedProductId(""); setSelectedColorId(""); setSelectedDimensionId("");
    };

    const removeLineItem = (index: number) => {
        const newItems = [...currentItems];
        newItems.splice(index, 1);
        setCurrentItems(newItems);
    };

    // KAYDET (UPDATE)
    const handleUpdate = async () => {
        if (!headerData.storeId || !id) return;

        // Eşleştirme ve Fark Analizi
        const added: SaleItem[] = [];
        const removed: SaleItem[] = [];
        const tempCurrent = [...currentItems];

        originalItems.forEach(orig => {
            const matchIdx = tempCurrent.findIndex(curr =>
                curr.productId === orig.productId &&
                curr.colorId === orig.colorId &&
                curr.dimensionId === orig.dimensionId &&
                curr.price === orig.price &&
                curr.productNote === orig.productNote
            );

            if (matchIdx > -1) {
                tempCurrent.splice(matchIdx, 1); // Eşleşeni listeden düş
            } else {
                removed.push(orig); // Eşleşmediyse silinmiştir
            }
        });

        // tempCurrent içinde kalanlar yeni eklenenlerdir
        added.push(...tempCurrent);

        try {
            const result = await updateSale(headerData.storeId, id, headerData, added, removed);

            if (result.warning) {
                setMessage({ type: 'warning', text: `Güncellendi ama uyarı var: ${result.warning}` });
            } else {
                setMessage({ type: 'success', text: 'Sipariş başarıyla güncellendi!' });
            }

            setTimeout(() => navigate('/sales'), 2000);

        } catch (error: any) {
            setMessage({ type: 'error', text: "Hata: " + error.message });
        }
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    // Stiller
    const cellStyle = { padding: '6px', verticalAlign: 'middle' };
    const smallInput = { width: '60px', padding: '6px', fontSize: '13px', textAlign: 'center' as const };
    const mediumInput = { width: '80px', padding: '6px', fontSize: '13px' };
    const selectStyle = { width: '100%', padding: '6px', fontSize: '12px' };
    const filterSelectStyle = { width: '90px', padding: '6px', fontSize: '11px', marginRight: '4px' };

    return (
        <div className="page-container">
            {message && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', padding: '15px 25px', borderRadius: '8px', zIndex: 9999,
                    color: message.type === 'warning' ? '#856404' : 'white',
                    backgroundColor: message.type === 'success' ? '#10b981' : message.type === 'warning' ? '#fff3cd' : '#ef4444',
                    border: message.type === 'warning' ? '1px solid #ffeeba' : 'none'
                }}>
                    {message.text}
                </div>
            )}

            <div className="modern-header">
                <div>
                    <h2 className="page-title">Siparişi Düzenle</h2>
                    <p style={{ color: '#666' }}>Fiş No: <strong>{headerData.receiptNo}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate('/sales')} className="modern-btn btn-secondary">İptal</button>
                    <button onClick={handleUpdate} className="modern-btn btn-primary">DEĞİŞİKLİKLERİ KAYDET</button>
                </div>
            </div>

            {/* FORM ALANI (SaleAdd ile benzer, value'lar headerData'dan gelir) */}
            <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>Müşteri ve Teslimat Bilgileri</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                        <label className="form-label">Müşteri Adı</label>
                        <input name="customerName" value={headerData.customerName} onChange={handleHeaderChange} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">Telefon</label>
                        <input name="phone" value={headerData.phone} onChange={handleHeaderChange} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">İl</label>
                        <select name="city" value={headerData.city} onChange={handleHeaderChange} className="form-input">
                            <option value="">Seçiniz</option>
                            {iller.map(il => <option key={il.id} value={il.isim}>{il.isim}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">İlçe</label>
                        <select name="district" value={headerData.district} onChange={handleHeaderChange} className="form-input">
                            <option value="">Seçiniz</option>
                            {districts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Adres</label>
                        <input name="address" value={headerData.address} onChange={handleHeaderChange} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">Termin Tarihi</label>
                        <input type="date" name="deadline" value={headerData.deadline} onChange={handleHeaderChange} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">Nakliye Ücreti</label>
                        <input type="number" name="shippingCost" value={headerData.shippingCost} onChange={handleHeaderChange} className="form-input" />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Not / Açıklama</label>
                        <input name="explanation" value={headerData.explanation} onChange={handleHeaderChange} className="form-input" />
                    </div>
                </div>
            </div>

            {/* ÜRÜN LİSTESİ VE EKLEME */}
            <div className="card">
                <div className="card-header" style={{ padding: '15px 20px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#2c3e50' }}>Ürünler</h3>
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

                            {/* --- MEVCUT LİSTE --- */}
                            {currentItems.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
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
                                    <td style={{ padding: '10px 12px', fontSize: '13px', color: '#475569' }}>
                                        {getName(allColors, item.colorId, 'colorName')}
                                    </td>
                                    <td style={{ textAlign: 'center', color: '#ccc' }}>-</td>
                                    <td style={{ padding: '10px 12px', fontSize: '13px', color: '#475569' }}>
                                        {item.cushionId ? getName(cushions, item.cushionId, 'cushionName') : '-'}
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', padding: '10px' }}>{item.quantity}</td>
                                    <td style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{item.price} ₺</td>
                                    <td><span className={`status-badge ${item.supplyMethod === 'Stoktan' ? 'success' : 'danger'}`} style={{ fontSize: '10px' }}>{item.supplyMethod}</span></td>
                                    <td>-</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button onClick={() => removeLineItem(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>×</button>
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

export default SaleEdit;