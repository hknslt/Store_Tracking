// src/pages/purchases/ControlPurchaseList.tsx
import React, { useEffect, useState } from "react";
import { updatePurchaseItemStatus, getAllPurchases} from "../../services/purchaseService";
import { getStores } from "../../services/storeService";
import { getCategories, getCushions, getColors, getDimensions } from "../../services/definitionService";
import { exportPurchasesToExcel } from "../../utils/excelExport";
import type { Purchase, Store, Category, Cushion, Color, Dimension, PurchaseStatus } from "../../types";
import "../../App.css";

const ControlPurchaseList = () => {

    // Veriler
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);

    // Arayüz State'leri
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

    //  Artık tek bir string değil, açık olan tüm satırların ID'lerini bir dizide (array) tutuyoruz
    const [expandedRowIds, setExpandedRowIds] = useState<string[]>([]);

    // Durum Filtreleri
    const [selectedStatuses, setSelectedStatuses] = useState<PurchaseStatus[]>(['Beklemede', 'Onaylandı', 'Üretim', 'Sevkiyat']);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        const initData = async () => {
            try {
                const [pData, sData, cats, cushs, cols, dims] = await Promise.all([
                    getAllPurchases(), getStores(), getCategories(), getCushions(), getColors(), getDimensions()
                ]);
                setPurchases(pData);
                setStores(sData); setCategories(cats); setCushions(cushs); setColors(cols); setDimensions(dims);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, []);

    const refreshData = async () => {
        const pData = await getAllPurchases();
        setPurchases(pData);
    };

    // Filtreleme
    const getProcessedPurchases = () => {
        return purchases.filter(p => {
            // 1. Mağaza Filtresi
            if (selectedStoreId !== "all" && p.storeId !== selectedStoreId) return false;

            // 2. Arama Filtresi
            const matchesSearch = p.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.items.some(i => i.productName.toLowerCase().includes(searchTerm.toLowerCase()));
            if (!matchesSearch) return false;

            // 3. Durum / Sekme Filtresi
            const isCanceled = p.items.every(i => i.status === 'İptal');
            const isAllCompleted = p.items.every(item => item.status === 'Tamamlandı');
            const isFinished = isAllCompleted || isCanceled;

            if (activeTab === 'completed') {
                return isFinished;
            } else {
                if (isFinished) return false;
                return p.items.some(item => selectedStatuses.includes(item.status));
            }
        });
    };

    const displayPurchases = getProcessedPurchases();

    // Yardımcılar
    const formatDate = (d: string) => (!d ? "-" : new Date(d).toLocaleDateString('tr-TR'));
    const getStoreName = (id: string) => stores.find(s => s.id === id)?.storeName || "Bilinmeyen";
    const getCatName = (id?: string) => categories.find(c => c.id === id)?.categoryName || "";

    const getColorName = (id?: string) => colors.find(c => c.id === id)?.colorName || "-";
    const getDimensionName = (id?: string | null) => id ? (dimensions.find(d => d.id === id)?.dimensionName || "") : "";

    const toggleStatusFilter = (status: PurchaseStatus) => {
        setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
    };

    // Satır açma/kapatma fonksiyonu. İçeriyorsa çıkar, içermiyorsa ekle.
    const toggleRow = (id: string) => {
        setExpandedRowIds(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        );
    };

    const getNextStatus = (current: PurchaseStatus): PurchaseStatus | null => {
        switch (current) { case 'Beklemede': return 'Onaylandı'; case 'Onaylandı': return 'Üretim'; case 'Üretim': return 'Sevkiyat'; case 'Sevkiyat': return 'Tamamlandı'; default: return null; }
    };
    const getButtonText = (current: PurchaseStatus) => {
        switch (current) { case 'Beklemede': return 'Onayla'; case 'Onaylandı': return 'Üretime Al'; case 'Üretim': return 'Sevkiyata Çıkar'; case 'Sevkiyat': return 'Teslim Edildi İşaretle'; case 'Tamamlandı': return '✔ Bitti'; default: return current; }
    };

    const handleStatusClick = async (storeId: string, purchaseId: string, itemIndex: number, currentStatus: PurchaseStatus) => {
        const nextStatus = getNextStatus(currentStatus);
        if (!nextStatus) return;
        try {
            await updatePurchaseItemStatus(storeId, purchaseId, itemIndex, nextStatus);
            await refreshData();
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: "Durum güncellenemedi!" });
        }
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '100px' }}>Veriler yükleniyor...</div>;

    return (
        <div className="page-container" style={{ backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
            {message && <div style={{ position: 'fixed', top: '20px', right: '20px', padding: '15px 25px', borderRadius: '8px', color: 'white', backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444', zIndex: 9999 }}>{message.text}</div>}

            {/* ÜST BAŞLIK */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#0f172a' }}>Üretim & Tedarik Kontrol Paneli</h2>
                    <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '14px' }}>Tüm mağazaların siparişlerini tek merkezden yönetin.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => exportPurchasesToExcel(displayPurchases, "Tum_Magazalar", categories, cushions, colors, dimensions)} className="btn btn-secondary" style={{ backgroundColor: '#16a34a', color: 'white', border: 'none' }}>
                        Toplu Excel İndir
                    </button>
                </div>
            </div>

            {/* KONTROL BAR */}
            <div style={{ display: 'flex', gap: '15px', backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', marginBottom: '20px', flexWrap: 'wrap' }}>
                <select value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', flex: 1, minWidth: '200px', fontWeight: 'bold', color: '#1e293b' }}>
                    <option value="all">Tüm Mağazalar</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                </select>

                <input type="text" placeholder="Fiş No veya Ürün Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: 2, minWidth: '250px', outline: 'none' }} />
            </div>

            {/* SEKMELER VE FİLTRELER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setActiveTab('active')} className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}>Aktif Operasyonlar</button>
                    <button onClick={() => setActiveTab('completed')} className={`btn ${activeTab === 'completed' ? 'btn-past' : 'btn-secondary'}`}>Tamamlananlar</button>
                </div>

                {activeTab === 'active' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['Beklemede', 'Onaylandı', 'Üretim', 'Sevkiyat'].map((status) => {
                            const isSelected = selectedStatuses.includes(status as PurchaseStatus);
                            let color = '#3b82f6';
                            if (status === 'Onaylandı') color = '#f59e0b';
                            if (status === 'Üretim') color = '#8b5cf6';
                            if (status === 'Sevkiyat') color = '#10b981';

                            return (
                                <button key={status} onClick={() => toggleStatusFilter(status as PurchaseStatus)} style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid ${isSelected ? color : '#e2e8f0'}`, backgroundColor: isSelected ? `${color}15` : 'white', color: isSelected ? color : '#64748b', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>
                                    {isSelected && '✓ '} {status}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* TABLO */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <table className="modern-table">
                    <thead style={{ backgroundColor: '#f8fafc' }}>
                        <tr>
                            <th style={{ width: '40px' }}></th>
                            <th>Mağaza</th>
                            <th>Tarih</th>
                            <th>Fiş No</th>
                            <th>Ekleyen Personel</th>
                            <th>Durum Özeti</th>
                            <th style={{ textAlign: 'right' }}>Toplam Tutar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayPurchases.map(p => {
                            // isExpanded mantığı dizi içinde arama yapacak şekilde çalışıyor
                            const isExpanded = expandedRowIds.includes(p.id!);
                            const isCancelled = p.items.every(i => i.status === 'İptal');

                            return (
                                <React.Fragment key={p.id}>
                                    {/* ANA SATIR */}
                                    <tr style={{ backgroundColor: isExpanded ? '#f1f5f9' : 'white', cursor: 'pointer', borderBottom: '1px solid #e2e8f0' }} onClick={() => toggleRow(p.id!)}>
                                        <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '18px' }}>{isExpanded ? '▾' : '▸'}</td>
                                        <td>
                                            <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
                                                {getStoreName(p.storeId)}
                                            </span>
                                        </td>
                                        <td style={{ color: '#475569', fontSize: '13px', fontWeight: '500' }}>{formatDate(p.date)}</td>
                                        <td style={{ fontWeight: 'bold', color: '#0f172a' }}>{p.receiptNo}</td>
                                        <td style={{ color: '#64748b', fontSize: '13px' }}>{p.personnelName}</td>
                                        <td>
                                            {isCancelled ? (
                                                <span className="status-badge danger">İptal Edildi</span>
                                            ) : (
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>{p.items.length} Kalem Ürün</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>{p.totalAmount.toLocaleString('tr-TR')} ₺</td>
                                    </tr>

                                    {/* DETAY (GENİŞLETİLMİŞ) SATIR */}
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={7} style={{ padding: 0, backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                                                <div style={{ padding: '15px 40px' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                        <thead>
                                                            <tr style={{ backgroundColor: '#e2e8f0', color: '#334155', fontSize: '12px', textAlign: 'left' }}>
                                                                <th style={{ padding: '10px' }}>Ürün Adı</th>
                                                                <th style={{ padding: '10px' }}>Renk / Ebat</th>
                                                                <th style={{ padding: '10px', textAlign: 'center' }}>Adet</th>
                                                                {/* 🔥 AÇIKLAMA SÜTUNU EKLENDİ */}
                                                                <th style={{ padding: '10px' }}>Açıklama / Not</th>
                                                                <th style={{ padding: '10px' }}>Mevcut Durum</th>
                                                                <th style={{ padding: '10px', textAlign: 'right' }}>Hızlı İşlem</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {p.items.map((item, idx) => (
                                                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                    <td style={{ padding: '10px', fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>
                                                                        {item.productName.split('-')[0]} <span style={{ color: '#94a3b8', fontWeight: 'normal', fontSize: '11px' }}>({getCatName(item.categoryId)})</span>
                                                                    </td>
                                                                    <td style={{ padding: '10px', fontSize: '13px', color: '#475569' }}>
                                                                        {getColorName(item.colorId)} {item.dimensionId ? `/ ${getDimensionName(item.dimensionId)}` : ''}
                                                                    </td>
                                                                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>

                                                                    {/* 🔥 AÇIKLAMA VERİSİ EKLENDİ */}
                                                                    <td style={{ padding: '10px', fontSize: '12px', color: '#dc2626', fontStyle: 'italic', maxWidth: '200px' }}>
                                                                        {item.explanation || (item as any).productNote || "-"}
                                                                    </td>

                                                                    <td style={{ padding: '10px' }}>
                                                                        <span className={`status-badge ${item.status === 'Beklemede' ? 'primary' : item.status === 'Onaylandı' ? 'warning' : item.status === 'Üretim' ? 'neutral' : item.status === 'Sevkiyat' ? 'info' : item.status === 'Tamamlandı' ? 'success' : 'danger'}`}>
                                                                            {item.status}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '10px', textAlign: 'right' }}>
                                                                        {item.status !== 'Tamamlandı' && item.status !== 'İptal' && (
                                                                            <button
                                                                                onClick={() => handleStatusClick(p.storeId, p.id!, idx, item.status)}
                                                                                style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                                                                            >
                                                                                {getButtonText(item.status)} ➜
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {displayPurchases.length === 0 && (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Bu kriterlere uygun sipariş bulunamadı.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default ControlPurchaseList;