// src/pages/sales/SaleList.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

import { cancelSaleComplete, getSalesByStore, updateSaleItemStatus, updateShippingCost } from "../../services/saleService";
import { getStores } from "../../services/storeService";
import {
    getCategories,
    getCushions,
    getColors,
    getDimensions,
} from "../../services/definitionService";

import type { Sale, Store, SystemUser, Category, Cushion, Color, Dimension, DeliveryStatus } from "../../types";
import "../../App.css";

import StoreIcon from "../../assets/icons/store.svg";

const SaleList = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Veri State'leri
    const [sales, setSales] = useState<Sale[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);

    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    // UI State'leri
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [rowStockStatus, setRowStockStatus] = useState<Record<string, number>>({});

    // Aktif / Geçmiş Tab Seçimi
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

    // Modal State
    const [showShippingModal, setShowShippingModal] = useState(false);
    const [pendingDelivery, setPendingDelivery] = useState<{ saleId: string, itemIndex: number } | null>(null);
    const [modalShippingCost, setModalShippingCost] = useState<string | number>(0);

    // İptal Modalı State
    const [cancelModal, setCancelModal] = useState<{ show: boolean, saleId: string | null }>({ show: false, saleId: null });

    // Filtreler
    const [searchTerm, setSearchTerm] = useState("");

    // Mesaj State'i
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Mesajı otomatik gizle
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // --- İŞLEM FONKSİYONLARI ---

    // 1. İptal Modalını Aç
    const openCancelModal = (saleId: string) => {
        setCancelModal({ show: true, saleId });
    };

    // 2. İptali Onayla ve Uygula
    const confirmCancelSale = async () => {
        if (!cancelModal.saleId) return;

        try {
            setLoading(true);
            await cancelSaleComplete(selectedStoreId, cancelModal.saleId);
            setMessage({ type: 'success', text: "Sipariş başarıyla iptal edildi." });
            setCancelModal({ show: false, saleId: null });
            await refreshSales();
        } catch (error: any) {
            setMessage({ type: 'error', text: "İptal sırasında hata oluştu: " + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusClick = async (sale: Sale, itemIndex: number, currentStatus: DeliveryStatus) => {
        if (currentStatus === 'Teslim Edildi') return;
        const remainingItems = sale.items.filter((item, idx) => idx !== itemIndex && item.deliveryStatus !== 'Teslim Edildi');

        if (remainingItems.length === 0) {
            setPendingDelivery({ saleId: sale.id!, itemIndex });
            setModalShippingCost(sale.shippingCost);
            setShowShippingModal(true);
        } else {
            try {
                await updateSaleItemStatus(selectedStoreId, sale.id!, itemIndex, 'Teslim Edildi');
                await refreshSales();
                if (expandedRowId === sale.id) toggleRow(sale.id!);
            } catch (error: any) {
                setMessage({ type: 'error', text: "Hata: " + error.message });
            }
        }
    };

    const confirmDeliveryWithShipping = async () => {
        if (!pendingDelivery) return;
        try {
            await updateSaleItemStatus(selectedStoreId, pendingDelivery.saleId, pendingDelivery.itemIndex, 'Teslim Edildi');
            await updateShippingCost(selectedStoreId, pendingDelivery.saleId, Number(modalShippingCost));
            setShowShippingModal(false);
            setPendingDelivery(null);
            await refreshSales();
            if (expandedRowId === pendingDelivery.saleId) toggleRow(pendingDelivery.saleId);
            setMessage({ type: 'success', text: "Teslimat tamamlandı." });
        } catch (error: any) {
            setMessage({ type: 'error', text: "İşlem hatası: " + error.message });
        }
    };

    // --- VERİ ÇEKME ---

    useEffect(() => {
        const initData = async () => {
            if (!currentUser) return;
            try {
                const [storesData, catsData, cushsData, colsData, dimsData] = await Promise.all([
                    getStores(), getCategories(), getCushions(), getColors(), getDimensions()
                ]);
                setStores(storesData); setCategories(catsData); setCushions(cushsData); setColors(colsData); setDimensions(dimsData);

                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data() as SystemUser;
                    if (userData.role === 'admin' || userData.role === 'control') { setIsAdmin(true); }
                    else if (userData.role === 'store_admin') { setIsAdmin(false); if (userData.storeId) setSelectedStoreId(userData.storeId); }
                }
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        initData();
    }, [currentUser]);

    const refreshSales = async () => {
        if (!selectedStoreId) return;
        const data = await getSalesByStore(selectedStoreId);
        data.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        setSales(data);
    };

    useEffect(() => { refreshSales(); }, [selectedStoreId]);

    // 🔥 GÜNCELLENMİŞ FİLTRELEME MANTIĞI
    const filteredSales = sales.filter(s => {
        const matchesSearch =
            s.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.customerName.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        // Sipariş İPTAL mi? (Sale tipine status eklendiyse s.status, yoksa grandTotal=0 ve items status kontrolü)
        // Service tarafında iptal olunca status: 'İptal' eklemiştik.
        const isCanceled = (s as any).status === 'İptal';

        // Tüm ürünler teslim edildi mi?
        const isAllDelivered = s.items.every(i => i.deliveryStatus === 'Teslim Edildi');

        // Bitti mi? (İptal edilmiş VEYA hepsi teslim edilmişse bitti sayılır)
        const isFinished = isCanceled || isAllDelivered;

        if (activeTab === 'active') {
            return !isFinished; // Aktif sekmesinde bitmemişler
        } else {
            return isFinished; // Geçmiş sekmesinde bitmişler (Teslim + İptal)
        }
    });

    const formatDate = (dateString: string) => { if (!dateString) return "-"; return new Date(dateString).toLocaleDateString('tr-TR'); };
    const getCatName = (id?: string) => categories.find(c => c.id === id)?.categoryName || "";
    const getCushionName = (id?: string) => cushions.find(c => c.id === id)?.cushionName || "-";
    const getColorName = (id?: string) => colors.find(c => c.id === id)?.colorName || "-";
    const getDimensionName = (id?: string | null) => id ? (dimensions.find(d => d.id === id)?.dimensionName || "") : "";

    const toggleRow = async (saleId: string) => {
        if (expandedRowId === saleId) {
            setExpandedRowId(null);
            setRowStockStatus({});
        } else {
            setExpandedRowId(saleId);
            const sale = sales.find(s => s.id === saleId);
            if (sale) {
                const stocks: Record<string, number> = {};
                await Promise.all(sale.items.map(async (item) => {
                    const uniqueId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                    const stockRef = doc(db, "stores", selectedStoreId, "stocks", uniqueId);
                    const snap = await getDoc(stockRef);
                    stocks[uniqueId] = snap.exists() ? snap.data().reservedStock || 0 : 0;
                }));
                setRowStockStatus(stocks);
            }
        }
    };

    const goToDetail = (sale: Sale) => { if (sale.id && selectedStoreId) navigate(`/sales/${selectedStoreId}/${sale.id}`, { state: { sale } }); };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">

            {/* Mesaj Bildirimi */}
            {message && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                    padding: '15px 25px', borderRadius: '8px', color: 'white',
                    fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444',
                    animation: 'fadeIn 0.3s ease-in-out'
                }}>
                    {message.type === 'success' ? '✅' : '⚠️'} {message.text}
                </div>
            )}

            {/* Nakliye Ücreti Modalı */}
            {showShippingModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '300px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0, color: '#2c3e50' }}>Teslimat Tamamlanıyor</h3>
                        <p style={{ fontSize: '14px', color: '#555' }}>Tüm ürünler teslim edildi. Nakliye ücretini giriniz:</p>
                        <input
                            type="number"
                            className="form-input"
                            value={modalShippingCost}
                            onChange={e => setModalShippingCost(e.target.value)}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowShippingModal(false)} className="btn btn-secondary">İptal</button>
                            <button onClick={confirmDeliveryWithShipping} className="btn btn-success">Tamamla & Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            {/* İptal Onay Modalı */}
            {cancelModal.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
                }}>
                    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', textAlign: 'center' }}>
                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
                            <h3 style={{ margin: 0, color: '#2c3e50' }}>Siparişi İptal Et?</h3>
                        </div>
                        <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.5', marginBottom: '20px' }}>
                            Bu işlem geri alınamaz!<br /><br />
                            • Merkezden istenen stok talepleri düşülecek.<br />
                            • Depoya giren stoklar geri alınacak.<br />
                            • Müşteri borcu silinecek.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setCancelModal({ show: false, saleId: null })}
                                className="btn btn-secondary"
                                style={{ padding: '10px 20px' }}
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={confirmCancelSale}
                                className="btn"
                                style={{ backgroundColor: '#dc2626', color: 'white', padding: '10px 20px', border: 'none' }}
                            >
                                Evet, İptal Et
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div className="page-title"><h2>Satış Listesi</h2><p>Sipariş ve Teslimat Takibi</p></div>
                <Link to="/sales/add" className="btn btn-primary">+ Yeni Satış</Link>
            </div>

            <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    {isAdmin ? (
                        <select className="form-input" value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)} style={{ maxWidth: '250px' }}>
                            <option value="">-- Mağaza Seçiniz --</option>{stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                        </select>
                    ) : (
                        <div style={{ fontWeight: 'bold', color: '#2980b9', padding: '10px', backgroundColor: '#ecf0f1', borderRadius: '5px' }}>
                            {stores.find(s => s.id === selectedStoreId)?.storeName || "Mağazam"}
                        </div>
                    )}

                    <input
                        type="text"
                        placeholder="🔍 Müşteri veya Fiş No Ara..."
                        className="form-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ maxWidth: '300px' }}
                    />
                </div>
            </div>

            {/* Tab Butonları */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                    onClick={() => setActiveTab('active')}
                    className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, borderRadius: '8px', padding: '12px' }}
                >
                    Aktif Siparişler
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`btn ${activeTab === 'completed' ? 'btn-past' : 'btn-secondary'}`}
                    style={{ flex: 1, borderRadius: '8px', padding: '12px' }}
                >
                    Geçmiş (Tamamlananlar / İptaller)
                </button>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {selectedStoreId ? (
                        <table className="data-table">
                            <thead>
                                <tr style={{ backgroundColor: '#f8f9fa' }}>
                                    <th style={{ width: '5%', textAlign: 'center' }}>Drm</th>
                                    <th style={{ width: '10%' }}>Tarih</th>
                                    <th style={{ width: '12%' }}>Fiş No</th>
                                    <th style={{ width: '18%' }}>Müşteri Adı</th>
                                    <th style={{ width: '15%' }}>Termin Tarihi</th>
                                    <th style={{ width: '12%' }}>Personel</th>
                                    <th style={{ width: '13%', textAlign: 'right' }}>Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSales.length > 0 ? filteredSales.map(s => {
                                    const itemsTotal = s.items.reduce((acc, item) => acc + ((item.price - (item.discount || 0)) * item.quantity), 0);
                                    const isAllDelivered = s.items.every(i => i.deliveryStatus === 'Teslim Edildi');
                                    // 🔥 İptal Durumunu Kontrol Et
                                    const isCanceled = (s as any).status === 'İptal';

                                    return (
                                        <>
                                            <tr
                                                key={s.id}
                                                onClick={() => s.id && toggleRow(s.id)}
                                                className="hover-row"
                                                style={{
                                                    cursor: 'pointer',
                                                    backgroundColor: expandedRowId === s.id ? '#f0fdf4' : (isCanceled ? '#fff1f2' : 'white'), // İptal ise açık kırmızı zemin
                                                    opacity: isCanceled ? 0.7 : 1, // İptal ise biraz soluk
                                                    borderBottom: expandedRowId === s.id ? 'none' : '1px solid #eee'
                                                }}
                                            >
                                                <td style={{ textAlign: 'center', fontSize: '18px' }}>
                                                    {isCanceled ? (
                                                        <span className="badge" style={{ backgroundColor: '#e11d48', color: 'white', fontSize: '10px' }}>İPTAL</span>
                                                    ) : (
                                                        isAllDelivered ? <span style={{ color: '#27ae60' }}>●</span> : <span style={{ color: '#e74c3c' }}>●</span>
                                                    )}
                                                </td>
                                                <td style={{ textDecoration: isCanceled ? 'line-through' : 'none' }}>{formatDate(s.date)}</td>
                                                <td style={{ fontWeight: '600', color: '#2c3e50', textDecoration: isCanceled ? 'line-through' : 'none' }}>{s.receiptNo}</td>
                                                <td style={{ fontWeight: '500' }}>{s.customerName}</td>
                                                <td style={{
                                                    color: isCanceled ? '#999' : (new Date(s.deadline) < new Date() && !isAllDelivered ? '#e74c3c' : '#e67e22'),
                                                    fontWeight: '600'
                                                }}>
                                                    {formatDate(s.deadline)}
                                                </td>
                                                <td>{s.personnelName}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 'bold', color: isCanceled ? '#999' : '#27ae60' }}>
                                                    {isCanceled ? '0.00 ₺' : itemsTotal.toFixed(2) + ' ₺'}
                                                </td>
                                            </tr>

                                            {expandedRowId === s.id && (
                                                <tr style={{ backgroundColor: '#fbfbfb', borderBottom: '2px solid #ddd' }}>
                                                    <td colSpan={7} style={{ padding: '20px' }}>
                                                        <div style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: 'white', marginBottom: '10px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                <div>
                                                                    <div><strong>Tel:</strong> {s.phone} | <strong>Adres:</strong> {s.address}</div>
                                                                    {s.explanation && (
                                                                        <div style={{
                                                                            marginTop: '10px',
                                                                            padding: '8px',
                                                                            backgroundColor: '#fffbeb',
                                                                            border: '1px solid #fcd34d',
                                                                            borderRadius: '6px',
                                                                            color: '#92400e',
                                                                            fontSize: '13px',
                                                                            display: 'flex',
                                                                            gap: '5px'
                                                                        }}>
                                                                            <strong>📝 Sipariş Notu:</strong> {s.explanation}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                                    <button onClick={(e) => { e.stopPropagation(); goToDetail(s); }} className="btn btn-sm btn-info">
                                                                        🔍 Detay
                                                                    </button>

                                                                    {/* İPTAL BUTONU SADECE AKTİF SİPARİŞLERDE VE ADMİNDE GÖRÜNSÜN */}
                                                                    {isAdmin && !isCanceled && !isAllDelivered && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); openCancelModal(s.id!); }}
                                                                            className="btn btn-sm"
                                                                            style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                                                                        >
                                                                            ✕ İptal Et
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <table className="data-table dense" style={{ border: '1px solid #eee', backgroundColor: 'white' }}>
                                                            <thead>
                                                                <tr style={{ backgroundColor: '#f1f2f6' }}>
                                                                    <th style={{ width: '25%' }}>Ürün Bilgisi</th>
                                                                    <th style={{ width: '10%' }}>Renk</th>
                                                                    <th style={{ width: '10%' }}>Minder</th>
                                                                    <th style={{ width: '15%' }}>Not</th>
                                                                    <th style={{ textAlign: 'center', width: '5%' }}>Adet</th>
                                                                    <th style={{ textAlign: 'right', width: '10%' }}>Fiyat</th>
                                                                    <th style={{ textAlign: 'center', width: '10%' }}>Temin</th>
                                                                    <th style={{ width: '140px', textAlign: 'center' }}>Teslim İşlemi</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {s.items.map((item, idx) => {
                                                                    const uniqueId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                                                                    const availableReserved = rowStockStatus[uniqueId] || 0;
                                                                    const isArrived = availableReserved >= item.quantity;
                                                                    const isDelivered = item.deliveryStatus === 'Teslim Edildi';
                                                                    // İptal edilen siparişte butonlar pasif olsun
                                                                    const isActionEnabled = !isCanceled && !isDelivered && (item.supplyMethod === 'Stoktan' || isArrived);

                                                                    return (
                                                                        <tr key={idx} style={{ backgroundColor: isDelivered ? '#fdfdfd' : 'inherit' }}>
                                                                            <td style={{ padding: '8px' }}>
                                                                                <span style={{ fontWeight: '600', color: '#34495e', marginRight: '6px' }}>{item.productName.split('-')[0].trim()}</span>
                                                                                {item.dimensionId && <span style={{ color: '#e67e22', fontWeight: '600', marginRight: '6px' }}>{getDimensionName(item.dimensionId)}</span>}
                                                                                <span style={{ color: '#7f8c8d', fontSize: '12px' }}>({getCatName(item.categoryId)})</span>
                                                                            </td>
                                                                            <td>{getColorName(item.colorId)}</td>
                                                                            <td>{getCushionName(item.cushionId)}</td>
                                                                            <td style={{ fontStyle: 'italic', color: '#777' }}>{item.productNote || "-"}</td>
                                                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                                                                            <td style={{ textAlign: 'right' }}>{item.price} ₺</td>
                                                                            <td style={{ textAlign: 'center' }}>
                                                                                <span className="badge" style={{ fontSize: '10px', backgroundColor: isDelivered ? '#ecf0f1' : (item.supplyMethod === 'Stoktan' ? '#d4edda' : (isArrived ? '#d4edda' : '#f8d7da')), color: isDelivered ? '#777' : (item.supplyMethod === 'Stoktan' || isArrived ? '#155724' : '#721c24') }}>
                                                                                    {item.supplyMethod === 'Stoktan' ? 'Stoktan' : (isArrived ? 'Merkez' : 'Merkez')}
                                                                                </span>
                                                                            </td>
                                                                            <td style={{ textAlign: 'center' }}>
                                                                                <button
                                                                                    onClick={() => handleStatusClick(s, idx, item.deliveryStatus!)}
                                                                                    disabled={!isActionEnabled}
                                                                                    className={`btn ${isDelivered ? 'btn-secondary' : 'btn-primary'}`}
                                                                                    style={{ width: '100%', padding: '5px 8px', fontSize: '11px', opacity: isActionEnabled ? 1 : 0.6, cursor: isActionEnabled ? 'pointer' : 'not-allowed' }}
                                                                                >
                                                                                    {isDelivered ? '✔ Teslim Edildi' : (isCanceled ? 'İptal' : 'Teslim Et')}
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                }) : (
                                    <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Bu kategoride satış kaydı bulunamadı.</td></tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#95a5a6' }}><div style={{ fontSize: '40px', marginBottom: '10px' }}><img src={StoreIcon} alt="" style={{ width: '40px', opacity: 0.6 }} /></div><p>Lütfen mağaza seçiniz.</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SaleList;