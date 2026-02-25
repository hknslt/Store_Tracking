// src/pages/purchases/PurchaseEdit.tsx
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { updatePurchase } from "../../services/purchaseService";
import { getGroups, getCategories, getCushions, getColors, getDimensions } from "../../services/definitionService";
import { getProducts } from "../../services/productService";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import type { Purchase, PurchaseItem, Category, Product, Cushion, Color, Dimension } from "../../types";
import "../../App.css";

const PurchaseEdit = () => {
    const navigate = useNavigate();
    const { id, storeId } = useParams();
    const location = useLocation();

    const [loading, setLoading] = useState(true);

    // Listeler
    const [groups, setGroups] = useState<any[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [allColors, setAllColors] = useState<Color[]>([]);
    const [allDimensions, setAllDimensions] = useState<Dimension[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);

    // Header & Items
    const [headerData, setHeaderData] = useState<any>({});
    const [originalItems, setOriginalItems] = useState<PurchaseItem[]>([]);
    const [currentItems, setCurrentItems] = useState<PurchaseItem[]>([]);

    // Yeni Satır Ekleme
    const [unitPrice, setUnitPrice] = useState<number | string>("");
    const [lineItem, setLineItem] = useState<Partial<PurchaseItem>>({ quantity: 1, itemType: 'Stok', status: 'Beklemede' });
    const [selectedProductId, setSelectedProductId] = useState("");
    const [selectedColorId, setSelectedColorId] = useState("");
    const [selectedDimensionId, setSelectedDimensionId] = useState("");

    // Mesaj ve Modal State'leri
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemIndexToDelete, setItemIndexToDelete] = useState<number | null>(null);

    // Başlangıç Verilerini Yükle
    useEffect(() => {
        const init = async () => {
            try {
                const [g, c, col, dim, cats, prods] = await Promise.all([
                    getGroups(), getCushions(), getColors(), getDimensions(), getCategories(), getProducts()
                ]);
                setGroups(g); setCushions(c); setAllColors(col); setAllDimensions(dim);
                setAllCategories(cats); setAllProducts(prods);

                let purchaseData: Purchase | null = location.state?.purchase || null;

                if (!purchaseData && storeId && id) {
                    const docRef = doc(db, "purchases", storeId, "receipts", id);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) purchaseData = { id: snap.id, ...snap.data() } as Purchase;
                }

                if (purchaseData) {
                    setHeaderData({
                        date: purchaseData.date,
                        receiptNo: purchaseData.receiptNo,
                        storeId: purchaseData.storeId,
                        personnelId: purchaseData.personnelId,
                        personnelName: purchaseData.personnelName
                    });
                    setOriginalItems(JSON.parse(JSON.stringify(purchaseData.items)));
                    setCurrentItems(purchaseData.items);
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

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Yardımcılar
    const getName = (list: any[], id: string | null | undefined, key: string) => list.find(x => x.id === id)?.[key] || "-";

    const handleHeaderChange = (e: any) => setHeaderData({ ...headerData, [e.target.name]: e.target.value });

    // Seçim Zinciri
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

    // Manuel Ekleme
    const addLineItem = () => {
        if (!lineItem.productId || !selectedColorId || !lineItem.quantity) {
            setMessage({ type: 'error', text: 'Eksik bilgi.' }); return;
        }

        const qty = Number(lineItem.quantity);
        const uPrice = Number(unitPrice);
        const totalAmount = uPrice * qty;

        const newItem: PurchaseItem = {
            ...(lineItem as PurchaseItem),
            colorId: selectedColorId,
            dimensionId: selectedDimensionId || null,
            amount: totalAmount,
            status: 'Beklemede',
            itemType: 'Stok'
        };

        setCurrentItems([...currentItems, newItem]);
        setLineItem({ quantity: 1, explanation: "", itemType: 'Stok', status: 'Beklemede' });
        setUnitPrice("");
        setSelectedProductId(""); setSelectedColorId(""); setSelectedDimensionId("");
    };

    //   SİLME İŞLEMLERİ (MODAL YÖNETİMİ)
    const removeLineItem = (index: number) => {
        const itemToRemove = currentItems[index];

        // Eğer ürün 'Sipariş' kaynaklıysa veya requestId varsa uyarı vermek için Modalı aç
        if (itemToRemove.itemType === 'Sipariş' || (itemToRemove as any).requestId) {
            setItemIndexToDelete(index);
            setShowDeleteModal(true);
            return;
        }

        // Değilse direkt sil
        executeDelete(index);
    };

    const executeDelete = (index: number) => {
        const newItems = [...currentItems];
        newItems.splice(index, 1);
        setCurrentItems(newItems);
    };

    const confirmDelete = () => {
        if (itemIndexToDelete !== null) {
            executeDelete(itemIndexToDelete);
        }
        setShowDeleteModal(false);
        setItemIndexToDelete(null);
    };

    // GÜNCELLEME İŞLEMİ
    const handleUpdate = async () => {
        if (!headerData.storeId || !id) return;

        const added: PurchaseItem[] = [];
        const removed: PurchaseItem[] = [];
        const tempCurrent = [...currentItems];

        originalItems.forEach(orig => {
            const matchIdx = tempCurrent.findIndex(curr =>
                curr.productId === orig.productId &&
                curr.colorId === orig.colorId &&
                curr.dimensionId === orig.dimensionId &&
                curr.amount === orig.amount
            );

            if (matchIdx > -1) {
                tempCurrent.splice(matchIdx, 1);
            } else {
                removed.push(orig);
            }
        });

        added.push(...tempCurrent);

        try {
            await updatePurchase(headerData.storeId, id, headerData, added, removed);
            setMessage({ type: 'success', text: 'Alış fişi başarıyla güncellendi!' });
            setTimeout(() => navigate('/purchases'), 1500);
        } catch (error: any) {
            setMessage({ type: 'error', text: "Hata: " + error.message });
        }
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    // Stiller
    const cellStyle = { padding: '6px', verticalAlign: 'middle' };
    const smallInput = { width: '50px', padding: '6px', fontSize: '13px', textAlign: 'center' as const };
    const mediumInput = { width: '70px', padding: '6px', fontSize: '13px' };
    const selectStyle = { width: '100%', padding: '6px', fontSize: '12px' };
    const filterSelectStyle = { width: '90px', padding: '6px', fontSize: '11px', marginRight: '4px' };

    const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' };
    const modalContentStyle: React.CSSProperties = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '400px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };

    return (
        <div className="page-container">
            {/* TOAST MESAJ */}
            {message && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, padding: '15px 25px', borderRadius: '8px', color: 'white', fontWeight: '600', backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', animation: 'fadeIn 0.3s' }}>
                    {message.text}
                </div>
            )}

            {/*   SİLME ONAY MODALI */}
            {showDeleteModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>Ürünü Sil?</h3>
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px', lineHeight: '1.5' }}>
                            <strong style={{ color: '#dc2626' }}>DİKKAT: Bu ürün bir müşteri siparişine bağlıdır!</strong><br /><br />
                            Eğer bu ürünü silerseniz, müşteri siparişinin tedarik süreci aksayabilir. Yine de silmek istiyor musunuz?
                        </p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button onClick={() => { setShowDeleteModal(false); setItemIndexToDelete(null); }} className="modern-btn btn-secondary" style={{ flex: 1 }}>İptal</button>
                            <button onClick={confirmDelete} className="modern-btn" style={{ flex: 1, backgroundColor: '#dc2626', color: 'white', border: 'none' }}>Evet, Sil</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="modern-header">
                <div>
                    <h2 className="page-title">Alış Fişini Düzenle</h2>
                    <p style={{ color: '#666' }}>Fiş No: <strong>{headerData.receiptNo}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate('/purchases')} className="modern-btn btn-secondary">İptal</button>
                    <button onClick={handleUpdate} className="modern-btn btn-primary">DEĞİŞİKLİKLERİ KAYDET</button>
                </div>
            </div>

            <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                    <div>
                        <label className="form-label">Tarih</label>
                        <input type="date" name="date" value={headerData.date} onChange={handleHeaderChange} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">Fiş No</label>
                        <input name="receiptNo" value={headerData.receiptNo} onChange={handleHeaderChange} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">Personel</label>
                        <input value={headerData.personnelName} disabled className="form-input" style={{ backgroundColor: '#f1f5f9' }} />
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header" style={{ padding: '15px 20px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#2c3e50' }}>Ürünler</h3>
                </div>
                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                    <table className="modern-table dense">
                        <thead style={{ backgroundColor: '#f8fafc' }}>
                            <tr>
                                <th style={{ width: '30%' }}>Ürün Seçimi (Grup - Kat - Ad)</th>
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
                            <tr style={{ backgroundColor: '#f0fff4', borderTop: '2px solid #3b82f6' }}>
                                <td style={cellStyle}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <select className="soft-input" style={filterSelectStyle} onChange={e => handleGroupChange(e.target.value)}><option value="">Grup</option>{groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}</select>
                                        <select className="soft-input" style={filterSelectStyle} onChange={e => handleCategoryChange(e.target.value)}><option value="">Kat</option>{filteredCategories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}</select>
                                        <select className="soft-input" style={{ ...selectStyle, flex: 1, fontWeight: 'bold' }} value={selectedProductId} onChange={e => handleProductChange(e.target.value)}><option value="">Ürün</option>{filteredProducts.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}</select>
                                    </div>
                                </td>
                                <td style={cellStyle}>
                                    <select className="soft-input" style={selectStyle} value={selectedColorId} onChange={e => setSelectedColorId(e.target.value)}><option value="">Seç</option>{allColors.map(c => <option key={c.id} value={c.id}>{c.colorName}</option>)}</select>
                                </td>
                                <td style={cellStyle}>
                                    <select className="soft-input" style={selectStyle} value={selectedDimensionId} onChange={e => setSelectedDimensionId(e.target.value)}><option value="">Seç</option>{allDimensions.map(d => <option key={d.id} value={d.id}>{d.dimensionName}</option>)}</select>
                                </td>
                                <td style={cellStyle}>
                                    <select className="soft-input" style={selectStyle} name="cushionId" value={lineItem.cushionId} onChange={(e: any) => setLineItem({ ...lineItem, cushionId: e.target.value })}><option value="">Yok</option>{cushions.map(c => <option key={c.id} value={c.id}>{c.cushionName}</option>)}</select>
                                </td>
                                <td style={cellStyle}>
                                    <input type="number" className="soft-input" style={{ ...smallInput, fontWeight: 'bold' }} value={lineItem.quantity} onChange={(e: any) => setLineItem({ ...lineItem, quantity: Number(e.target.value) })} />
                                </td>
                                <td style={cellStyle}>
                                    <input type="number" className="soft-input" style={mediumInput} value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="Birim ₺" />
                                </td>
                                <td style={cellStyle}>
                                    <input type="text" className="soft-input" style={{ width: '100%' }} value={lineItem.explanation} onChange={(e: any) => setLineItem({ ...lineItem, explanation: e.target.value })} onKeyDown={e => e.key === 'Enter' && addLineItem()} />
                                </td>
                                <td style={cellStyle}>
                                    <button onClick={addLineItem} className="modern-btn btn-primary" style={{ padding: '0 10px', height: '32px' }}>+</button>
                                </td>
                            </tr>

                            {currentItems.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '10px 15px' }}>
                                        <span style={{ fontWeight: '600', color: '#1e293b' }}>{item.productName.split('-')[0].trim()}</span>
                                        {item.dimensionId && <span style={{ color: '#e67e22', fontWeight: '600', marginLeft: '5px' }}>{getName(allDimensions, item.dimensionId, 'dimensionName')}</span>}
                                    </td>
                                    <td style={{ padding: '10px 15px' }}>{getName(allColors, item.colorId, 'colorName')}</td>
                                    <td style={{ padding: '10px 15px' }}>{getName(allDimensions, item.dimensionId, 'dimensionName')}</td>
                                    <td style={{ padding: '10px 15px' }}>{item.cushionId ? getName(cushions, item.cushionId, 'cushionName') : '-'}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                                    <td style={{ textAlign: 'right' }}>{Number(item.amount / item.quantity).toFixed(2)} ₺</td>
                                    <td style={{ padding: '10px 15px', color: '#666', fontStyle: 'italic' }}>{item.explanation}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {item.status === 'Tamamlandı' || item.status === 'İptal' ? (
                                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>{item.status}</span>
                                        ) : (
                                            <button onClick={() => removeLineItem(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }} title="Listeden Çıkar">×</button>
                                        )}
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

export default PurchaseEdit;