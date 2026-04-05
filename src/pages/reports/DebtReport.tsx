// src/pages/reports/DebtReport.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { collectionGroup, getDocs } from "firebase/firestore";
import { getStores } from "../../services/storeService";
import { getCategories, getColors, getDimensions } from "../../services/definitionService";
import { exportDebtAnalysisToExcel } from "../../utils/excelExport";
import type { Store, Category, Color, Dimension } from "../../types";
import "../../App.css";

interface DebtAnalysisItem {
    id: string;
    saleId: string;
    storeId: string;
    storeName: string;
    receiptNo: string;
    customerName: string;
    saleDate: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    status: string;
    totalItems: number;
    deliveredItems: number;
    items: any[];
    originalSale: any;
}

const DebtReport = () => {
    const { userData, userRole } = useAuth();
    const navigate = useNavigate();

    const isAdmin = ['admin', 'control', 'report'].includes(userRole || '');

    const [data, setData] = useState<DebtAnalysisItem[]>([]);
    const [stores, setStores] = useState<Store[]>([]);

    const [categories, setCategories] = useState<Category[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);

    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [expandedRowIds, setExpandedRowIds] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Gerekli Tanımlamaları Çek
                const [storesSnap, cats, cols, dims] = await Promise.all([
                    getStores(), getCategories(), getColors(), getDimensions()
                ]);
                setStores(storesSnap);
                setCategories(cats);
                setColors(cols);
                setDimensions(dims);

                const storesMap = storesSnap.reduce((acc, s) => ({ ...acc, [s.id!]: s.storeName }), {} as Record<string, string>);

                // 2. Tüm Borçları Çek
                const debtsSnap = await getDocs(collectionGroup(db, "debts"));
                const debts: any[] = [];
                debtsSnap.forEach(d => {
                    const docData = d.data();
                    if (isAdmin || docData.storeId === userData?.storeId) {
                        debts.push({ id: d.id, ...docData });
                    }
                });

                // 3. Teslimat Durumu İçin Tüm Satışları Çek
                const receiptsSnap = await getDocs(collectionGroup(db, "receipts"));
                const salesItemsMap: Record<string, { total: number, delivered: number, items: any[], originalSale: any }> = {};

                receiptsSnap.forEach(doc => {
                    const rData = doc.data();
                    if (rData.status === 'İptal') return;

                    if (rData.items && Array.isArray(rData.items)) {
                        let totalQty = 0;
                        let deliveredQty = 0;

                        rData.items.forEach((item: any) => {
                            if (item.status !== 'İptal') {
                                const qty = Number(item.quantity || 1);
                                totalQty += qty;
                                if (item.deliveryStatus === 'Teslim Edildi') {
                                    deliveredQty += qty;
                                }
                            }
                        });
                        salesItemsMap[doc.id] = {
                            total: totalQty,
                            delivered: deliveredQty,
                            items: rData.items,
                            originalSale: { id: doc.id, storeId: doc.ref.parent.parent?.id, ...rData }
                        };
                    }
                });

                // 4. Verileri Birleştir ve 🔥 DİNAMİK HESAPLA
                const mergedData: DebtAnalysisItem[] = debts.map(debt => {
                    const total = Number(debt.totalAmount) || 0;
                    const paid = Number(debt.paidAmount) || 0;
                    const remaining = total - paid;

                    let currentStatus = 'Ödenmedi';
                    if (paid > 0) currentStatus = remaining <= 0.5 ? 'Ödendi' : 'Kısmi Ödeme';

                    return {
                        id: debt.id,
                        saleId: debt.saleId,
                        storeId: debt.storeId,
                        storeName: storesMap[debt.storeId] || 'Bilinmiyor',
                        receiptNo: debt.receiptNo,
                        customerName: debt.customerName,
                        saleDate: debt.saleDate,
                        totalAmount: total,
                        paidAmount: paid,
                        remainingAmount: remaining, // Veritabanını eziyoruz, canlı hesaplıyoruz
                        status: currentStatus,      // Veritabanını eziyoruz, canlı hesaplıyoruz
                        totalItems: salesItemsMap[debt.saleId]?.total || 0,
                        deliveredItems: salesItemsMap[debt.saleId]?.delivered || 0,
                        items: salesItemsMap[debt.saleId]?.items || [],
                        originalSale: salesItemsMap[debt.saleId]?.originalSale || null
                    };
                });

                // Tarihe göre yeniden eskiye sırala
                mergedData.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
                setData(mergedData);

            } catch (error) {
                console.error("Veri çekme hatası:", error);
            } finally {
                setLoading(false);
            }
        };

        if (userRole) fetchData();
    }, [userRole, userData, isAdmin]);

    // Filtreleme İşlemi
    const processedData = data.filter(item => {
        // Mağaza
        if (selectedStoreId !== "all" && item.storeId !== selectedStoreId) return false;

        // Durum
        if (statusFilter !== "all") {
            if (statusFilter === "Borçlu" && item.remainingAmount <= 0.5) return false;
            if (statusFilter === "Borcu Yok" && item.remainingAmount > 0.5) return false;
            if (statusFilter === "Eksik Teslimat" && item.deliveredItems >= item.totalItems) return false;
        }

        // Arama (Müşteri veya Fiş)
        const searchStr = searchTerm.toLowerCase();
        const matchesSearch = item.customerName.toLowerCase().includes(searchStr) || item.receiptNo.toLowerCase().includes(searchStr);
        if (!matchesSearch) return false;

        return true;
    });

    const formatMoney = (amount: number) => amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + " ₺";
    const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('tr-TR') : "-";
    const getName = (list: any[], id: string, key: string) => list.find(x => x.id === id)?.[key] || "-";

    const handleExport = () => {
        const sName = selectedStoreId === "all" ? "Tüm_Magazalar" : stores.find(s => s.id === selectedStoreId)?.storeName || "Magaza";
        exportDebtAnalysisToExcel(processedData, sName);
    };

    const toggleRow = (id: string) => {
        setExpandedRowIds(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '50px' }}>Analiz Yükleniyor...</div>;

    return (
        <div className="page-container">
            <div className="modern-header" style={{ marginBottom: '20px' }}>
                <div>
                    <h2>Borç ve Teslimat Analizi</h2>
                    <p style={{ color: '#64748b' }}>Müşterilerin ödeme durumları ile sipariş teslimat süreçlerinin eşzamanlı takibi.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleExport} className="btn btn-secondary" style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', fontWeight: 'bold' }}>
                        Excel İndir
                    </button>
                    <button onClick={() => navigate('/reports')} className="btn btn-secondary">
                        ← Raporlara Dön
                    </button>
                </div>
            </div>

            {/* FİLTRELER */}
            <div className="card" style={{ padding: '15px', marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', backgroundColor: '#f8fafc' }}>
                {isAdmin && (
                    <select className="form-input" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} style={{ flex: 1, minWidth: '150px' }}>
                        <option value="all">Tüm Mağazalar</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                    </select>
                )}

                <select className="form-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ flex: 1, minWidth: '150px' }}>
                    <option value="all">Tüm Kayıtlar</option>
                    <option value="Borçlu">Sadece Borcu Olanlar</option>
                    <option value="Borcu Yok">Borcu Bitenler (Ödendi)</option>
                    <option value="Eksik Teslimat">Teslimatı Tamamlanmayanlar</option>
                </select>

                <input
                    type="text"
                    className="form-input"
                    placeholder="Müşteri Adı veya Fiş No Ara..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ flex: 2, minWidth: '200px' }}
                />
            </div>

            {/* İSTATİSTİK ÖZETİ */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, backgroundColor: '#eff6ff', padding: '15px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: 'bold' }}>Filtrelenen Toplam Alacak</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e3a8a' }}>{formatMoney(processedData.reduce((a, b) => a + b.remainingAmount, 0))}</div>
                </div>
                <div style={{ flex: 1, backgroundColor: '#fef2f2', padding: '15px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 'bold' }}>Teslim Edilmeyen Toplam Ürün</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#7f1d1d' }}>{processedData.reduce((a, b) => a + (b.totalItems - b.deliveredItems), 0)} Adet</div>
                </div>
            </div>

            {/* TABLO */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <table className="modern-table dense">
                    <thead style={{ backgroundColor: '#f1f5f9' }}>
                        <tr>
                            <th style={{ width: '40px' }}></th>
                            {isAdmin && <th>Mağaza</th>}
                            <th>Tarih</th>
                            <th>Fiş No</th>
                            <th>Müşteri Adı</th>
                            <th style={{ textAlign: 'center' }}>Sipariş / Teslim</th>
                            <th style={{ textAlign: 'right' }}>Toplam Tutar</th>
                            <th style={{ textAlign: 'right' }}>Ödenen</th>
                            <th style={{ textAlign: 'right' }}>Kalan Borç</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedData.map((item) => {
                            const isFullyPaid = item.remainingAmount <= 0.5;
                            const isFullyDelivered = item.deliveredItems >= item.totalItems && item.totalItems > 0;
                            const isExpanded = expandedRowIds.includes(item.id);

                            return (
                                <React.Fragment key={item.id}>
                                    {/* ANA SATIR */}
                                    <tr
                                        className="hover-row"
                                        onClick={() => toggleRow(item.id)}
                                        style={{ backgroundColor: isExpanded ? '#f8fafc' : 'white', cursor: 'pointer', borderBottom: '1px solid #e2e8f0' }}
                                    >
                                        <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '18px' }}>{isExpanded ? '▾' : '▸'}</td>
                                        {isAdmin && <td style={{ fontWeight: '600', color: '#475569', fontSize: '12px' }}>{item.storeName}</td>}
                                        <td style={{ fontSize: '13px', color: '#64748b' }}>{formatDate(item.saleDate)}</td>
                                        <td style={{ fontWeight: 'bold', color: '#3b82f6' }}>{item.receiptNo}</td>
                                        <td style={{ fontWeight: '600', color: '#1e293b' }}>{item.customerName}</td>

                                        {/* TESLİMAT DURUMU */}
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                backgroundColor: isFullyDelivered ? '#dcfce7' : '#fef9c3',
                                                color: isFullyDelivered ? '#16a34a' : '#d97706',
                                                padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold'
                                            }}>
                                                {item.deliveredItems} / {item.totalItems}
                                            </span>
                                        </td>

                                        <td style={{ textAlign: 'right', fontWeight: '500', color: '#475569' }}>{formatMoney(item.totalAmount)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: '500', color: '#16a34a' }}>{formatMoney(item.paidAmount)}</td>

                                        {/* KALAN BORÇ */}
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: isFullyPaid ? '#94a3b8' : '#ef4444' }}>
                                            {formatMoney(item.remainingAmount)}
                                        </td>
                                    </tr>

                                    {/* AÇILAN DETAY SATIRI */}
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={isAdmin ? 9 : 8} style={{ padding: 0, backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                                                <div style={{ padding: '15px 40px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>

                                                    {/* ÜRÜNLER TABLOSU */}
                                                    <div style={{ flex: '1 1 500px' }}>
                                                        <h4 style={{ margin: '0 0 10px 0', color: '#334155', fontSize: '13px' }}>Sipariş İçeriği (Teslimat Detayları)</h4>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                            <thead style={{ backgroundColor: '#e2e8f0', color: '#334155', fontSize: '12px', textAlign: 'left' }}>
                                                                <tr>
                                                                    <th style={{ padding: '10px' }}>Ürün Adı</th>
                                                                    <th style={{ padding: '10px' }}>Renk / Ebat</th>
                                                                    <th style={{ padding: '10px', textAlign: 'center' }}>Adet</th>
                                                                    <th style={{ padding: '10px' }}>Teslimat Durumu</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {item.items.length > 0 ? item.items.map((prod, pIdx) => (
                                                                    <tr key={pIdx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                                                        <td style={{ padding: '10px', fontWeight: '500', color: '#1e293b' }}>
                                                                            {prod.productName.split('-')[0]} <span style={{ color: '#94a3b8', fontSize: '11px' }}>({getName(categories, prod.categoryId, 'categoryName')})</span>
                                                                        </td>
                                                                        <td style={{ padding: '10px', color: '#475569' }}>
                                                                            {getName(colors, prod.colorId, 'colorName')}
                                                                            {prod.dimensionId && ` / ${getName(dimensions, prod.dimensionId, 'dimensionName')}`}
                                                                        </td>
                                                                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{prod.quantity}</td>
                                                                        <td style={{ padding: '10px' }}>
                                                                            <span className={`status-badge ${prod.deliveryStatus === 'Teslim Edildi' ? 'success' : prod.deliveryStatus === 'İptal' ? 'danger' : 'warning'}`} style={{ fontSize: '10px' }}>
                                                                                {prod.deliveryStatus}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                )) : (
                                                                    <tr><td colSpan={4} style={{ padding: '15px', textAlign: 'center', color: '#94a3b8' }}>Ürün detayı bulunamadı (Eski kayıt veya silinmiş olabilir).</td></tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {/* SAĞ KISIM: MÜŞTERİ BİLGİSİ VE BUTON */}
                                                    <div style={{ flex: '1 1 250px', backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                                                        <h4 style={{ margin: '0 0 15px 0', color: '#334155', fontSize: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                                            Müşteri & Teslimat Bilgisi
                                                        </h4>
                                                        <div style={{ marginBottom: '10px', fontSize: '13px', color: '#475569' }}>
                                                            <strong>Telefon:</strong> <br />
                                                            <span style={{ color: '#1e293b' }}>{item.originalSale?.phone || 'Belirtilmedi'}</span>
                                                        </div>
                                                        <div style={{ marginBottom: '20px', fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>
                                                            <strong>Teslimat Adresi:</strong> <br />
                                                            <span style={{ color: '#1e293b' }}>{item.originalSale?.address || 'Mağazadan Teslim / Adres Girilmedi'}</span>
                                                            {item.originalSale?.district && item.originalSale?.city && (
                                                                <div>{item.originalSale.district} / {item.originalSale.city}</div>
                                                            )}
                                                        </div>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/sales/${item.storeId}/${item.saleId}`, { state: { sale: item.originalSale } });
                                                            }}
                                                            className="btn btn-secondary"
                                                            style={{ marginTop: 'auto', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', padding: '10px', fontWeight: 'bold' }}
                                                        >
                                                            Satış Detayına Git
                                                        </button>
                                                    </div>

                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {processedData.length === 0 && (
                            <tr>
                                <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Veri bulunamadı.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DebtReport;