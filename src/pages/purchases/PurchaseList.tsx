// src/pages/purchases/PurchaseList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getPurchasesByStore, updatePurchaseItemStatus } from "../../services/purchaseService";
import { getStores } from "../../services/storeService";
import { getCategories, getCushions, getColors, getDimensions } from "../../services/definitionService";

import type { Purchase, Store, Personnel, Category, Cushion, Color, Dimension, PurchaseStatus } from "../../types";
import "../../App.css";

const PurchaseList = () => {
    const { currentUser } = useAuth();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [stores, setStores] = useState<Store[]>([]);

    // Tanımlar
    const [categories, setCategories] = useState<Category[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);

    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    // --- BAŞLANGIÇ ---
    useEffect(() => {
        const init = async () => {
            if (!currentUser) return;
            try {
                const [sData, cats, cushs, cols, dims] = await Promise.all([
                    getStores(), getCategories(), getCushions(), getColors(), getDimensions()
                ]);
                setStores(sData); setCategories(cats); setCushions(cushs); setColors(cols); setDimensions(dims);

                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    const u = userDoc.data() as Personnel;
                    if (u.role === 'admin') { setIsAdmin(true); }
                    else { setIsAdmin(false); setSelectedStoreId(u.storeId); }
                }
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        init();
    }, [currentUser]);

    // --- VERİLERİ ÇEK ---
    const refreshPurchases = async () => {
        if (!selectedStoreId) return;
        const data = await getPurchasesByStore(selectedStoreId);
        setPurchases(data);
    };

    useEffect(() => { refreshPurchases(); }, [selectedStoreId]);

    // --- YARDIMCILAR ---
    const formatDate = (dateString: string) => { if (!dateString) return "-"; return new Date(dateString).toLocaleDateString('tr-TR'); };
    const getCatName = (id?: string) => categories.find(c => c.id === id)?.categoryName || "";
    const getCushionName = (id?: string) => cushions.find(c => c.id === id)?.cushionName || "-";
    const getColorName = (id?: string) => colors.find(c => c.id === id)?.colorName || "-";
    const getDimensionName = (id?: string | null) => id ? (dimensions.find(d => d.id === id)?.dimensionName || "") : "";

    // --- AKILLI BUTON MANTIĞI ---
    const getNextStatus = (current: PurchaseStatus): PurchaseStatus | null => {
        switch (current) {
            case 'Beklemede': return 'Onaylandı';
            case 'Onaylandı': return 'Üretim';
            case 'Üretim': return 'Sevkiyat';
            case 'Sevkiyat': return 'Tamamlandı';
            default: return null;
        }
    };

    const getButtonText = (current: PurchaseStatus) => {
        switch (current) {
            case 'Beklemede': return 'Onayla';
            case 'Onaylandı': return 'Üretime Al';
            case 'Üretim': return 'Sevkiyata Al';
            case 'Sevkiyat': return 'Tamamla';
            case 'Tamamlandı': return '✔ Tamamlandı';
            default: return current;
        }
    };

    const getButtonColor = (current: PurchaseStatus) => {
        switch (current) {
            case 'Beklemede': return 'btn-primary';
            case 'Onaylandı': return 'btn-warning';
            case 'Üretim': return 'btn-secondary';
            case 'Sevkiyat': return 'btn-primary';
            case 'Tamamlandı': return 'btn-success';
            default: return 'btn-secondary';
        }
    };

    const handleStatusClick = async (purchaseId: string, itemIndex: number, currentStatus: PurchaseStatus) => {
        const nextStatus = getNextStatus(currentStatus);
        if (!nextStatus) return;

        try {
            await updatePurchaseItemStatus(selectedStoreId, purchaseId, itemIndex, nextStatus);
            await refreshPurchases();
        } catch (error) {
            console.error(error);
            alert("Durum güncellenemedi!");
        }
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title">
                    <h2>Alış İşlemleri</h2>
                    <p>Depo Stok Girişleri ve Sipariş Tedarikleri</p>
                </div>
                <Link to="/purchases/add" className="btn btn-primary">+ Yeni Alış</Link>
            </div>

            <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    {isAdmin && (
                        <select className="form-input" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} style={{ maxWidth: '250px' }}>
                            <option value="">-- Mağaza Seçiniz --</option>{stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                        </select>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <th style={{ width: '5%', textAlign: 'center' }}>Drm</th>
                                <th style={{ width: '12%' }}>Tarih</th>
                                <th style={{ width: '15%' }}>Fiş No</th>
                                <th style={{ width: '12%', textAlign: 'center' }}>Çeşit</th>
                                <th style={{ width: '20%' }}>Personel</th>
                                <th style={{ width: '15%', textAlign: 'right' }}>Tutar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.map(p => {
                                // Tüm ürünler tamamlandı mı?
                                const isAllCompleted = p.items.every(item => item.status === 'Tamamlandı');

                                return (
                                    <>
                                        <tr key={p.id} className="hover-row" onClick={() => setExpandedRowId(expandedRowId === p.id ? null : p.id!)} style={{ cursor: 'pointer', borderBottom: expandedRowId === p.id ? 'none' : '1px solid #eee' }}>
                                            <td style={{ textAlign: 'center', fontSize: '18px' }}>
                                                {isAllCompleted ? <span style={{ color: '#27ae60' }}>●</span> : <span style={{ color: '#e74c3c' }}>●</span>}
                                            </td>
                                            <td>{formatDate(p.date)}</td>
                                            <td style={{ fontWeight: '600' }}>{p.receiptNo}</td>
                                            <td style={{ textAlign: 'center' }}>{p.items.length}</td>
                                            <td>{p.personnelName}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{p.totalAmount} ₺</td>
                                        </tr>

                                        {expandedRowId === p.id && (
                                            <tr style={{ backgroundColor: '#fbfbfb', borderBottom: '2px solid #ddd' }}>
                                                <td colSpan={6} style={{ padding: '20px' }}>
                                                    <table className="data-table dense" style={{ border: '1px solid #eee', backgroundColor: 'white' }}>
                                                        <thead>
                                                            <tr style={{ backgroundColor: '#f1f2f6' }}>
                                                                <th style={{ width: '30%' }}>Ürün Bilgisi</th>
                                                                <th style={{ width: '10%' }}>Renk</th>
                                                                <th style={{ width: '10%' }}>Minder</th>
                                                                <th style={{ width: '15%' }}>Açıklama</th>
                                                                <th style={{ textAlign: 'center' }}>Adet</th>
                                                                <th style={{ width: '120px', textAlign: 'center' }}>Durum</th>
                                                                <th style={{ width: '140px', textAlign: 'center' }}>İşlem</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {p.items.map((item, idx) => (
                                                                <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                                                    <td style={{ padding: '8px' }}>
                                                                        <span style={{ fontWeight: '600', color: '#34495e', marginRight: '6px' }}>{item.productName.split('-')[0].trim()}</span>
                                                                        {item.dimensionId && <span style={{ color: '#e67e22', fontWeight: '600', marginRight: '6px' }}>{getDimensionName(item.dimensionId)}</span>}
                                                                        <span style={{ color: '#34495e', fontWeight: '600' }}>{getCatName(item.categoryId)}</span>
                                                                    </td>
                                                                    <td>{getColorName(item.colorId)}</td>
                                                                    <td>{getCushionName(item.cushionId)}</td>
                                                                    <td style={{ color: '#777', fontStyle: 'italic' }}>{item.explanation || "-"}</td>
                                                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <span className="badge" style={{ backgroundColor: '#ecf0f1', color: '#34495e', fontSize: '11px' }}>{item.status}</span>
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <button
                                                                            onClick={() => handleStatusClick(p.id!, idx, item.status)}
                                                                            disabled={item.status === 'Tamamlandı'}
                                                                            className={`btn ${getButtonColor(item.status)}`}
                                                                            style={{ width: '100%', padding: '4px 8px', fontSize: '11px', opacity: item.status === 'Tamamlandı' ? 0.7 : 1, cursor: item.status === 'Tamamlandı' ? 'default' : 'pointer' }}
                                                                        >
                                                                            {getButtonText(item.status)}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PurchaseList;