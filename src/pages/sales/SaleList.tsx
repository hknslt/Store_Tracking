// src/pages/sales/SaleList.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

// Servisler
import { cancelSaleComplete, getSalesByStore, updateSaleItemStatus, updateShippingCost } from "../../services/saleService";
import { getStores } from "../../services/storeService";
import { getCategories, getCushions, getColors, getDimensions } from "../../services/definitionService";
import { generateSalesPDF } from "../../services/pdfService";

// Bileşenler
import SalesTableView from "../../components/sales/SalesTableView";
import SalesGridView from "../../components/sales/SalesGridView";

import type { Sale, Store, SystemUser, Category, Cushion, Color, Dimension, DeliveryStatus } from "../../types";
import "../../App.css";
import StoreIcon from "../../assets/icons/store.svg";

// İKONLAR (SVG)
const Icons = {
    pdf: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
    plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    list: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
    grid: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
    search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    sort: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
};

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
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [sortOrder, setSortOrder] = useState<'deadline_asc' | 'date_desc' | 'receipt_desc'>('deadline_asc');
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [rowStockStatus, setRowStockStatus] = useState<Record<string, number>>({});
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

    // Modal State
    const [showShippingModal, setShowShippingModal] = useState(false);
    const [pendingDelivery, setPendingDelivery] = useState<{ saleId: string, itemIndex: number } | null>(null);
    const [modalShippingCost, setModalShippingCost] = useState<string | number>(0);
    const [cancelModal, setCancelModal] = useState<{ show: boolean, saleId: string | null }>({ show: false, saleId: null });

    const [searchTerm, setSearchTerm] = useState("");
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Mesaj Gizleme
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

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
        setSales(data);
    };

    useEffect(() => { refreshSales(); }, [selectedStoreId]);

    // --- FİLTRELEME VE SIRALAMA ---
    const getProcessedSales = () => {
        let filtered = sales.filter(s => {
            const matchesSearch = s.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) || s.customerName.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            const isCanceled = (s as any).status === 'İptal';
            const isAllDelivered = s.items.every(i => i.deliveryStatus === 'Teslim Edildi');
            const isFinished = isCanceled || isAllDelivered;

            return activeTab === 'active' ? !isFinished : isFinished;
        });

        if (sortOrder === 'deadline_asc') {
            filtered.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        } else if (sortOrder === 'date_desc') {
            filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } else if (sortOrder === 'receipt_desc') {
            filtered.sort((a, b) => b.receiptNo.localeCompare(a.receiptNo, undefined, { numeric: true }));
        }

        return filtered;
    };

    const displaySales = getProcessedSales();

    // --- YARDIMCI FONKSİYONLAR ---
    const formatDate = (dateString: string) => (!dateString ? "-" : new Date(dateString).toLocaleDateString('tr-TR'));
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

    // --- İŞLEMLER ---
    const handlePrintPDF = () => {
        const storeName = stores.find(s => s.id === selectedStoreId)?.storeName || "Magaza";
        generateSalesPDF(displaySales, storeName, categories, cushions, colors, dimensions);
    };

    const confirmCancelSale = async () => {
        if (!cancelModal.saleId) return;
        try {
            setLoading(true);
            await cancelSaleComplete(selectedStoreId, cancelModal.saleId);
            setMessage({ type: 'success', text: "Sipariş iptal edildi." });
            setCancelModal({ show: false, saleId: null });
            await refreshSales();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally { setLoading(false); }
    };

    const confirmDeliveryWithShipping = async () => {
        if (!pendingDelivery) return;
        try {
            await updateSaleItemStatus(selectedStoreId, pendingDelivery.saleId, pendingDelivery.itemIndex, 'Teslim Edildi');
            await updateShippingCost(selectedStoreId, pendingDelivery.saleId, Number(modalShippingCost));
            setShowShippingModal(false);
            setPendingDelivery(null);
            await refreshSales();
            setMessage({ type: 'success', text: "Teslimat tamamlandı." });
        } catch (error: any) { setMessage({ type: 'error', text: error.message }); }
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
            } catch (error: any) { setMessage({ type: 'error', text: error.message }); }
        }
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {/* CSS Grid Stil Tanımı */}
            <style>{`
                .control-bar {
                    display: grid;
                    grid-template-columns: 220px 1fr 200px auto;
                    gap: 15px;
                    align-items: center;
                    background: white;
                    padding: 15px 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.03);
                    margin-bottom: 20px;
                }
                .form-control-wrapper {
                    position: relative;
                    width: 100%;
                }
                .form-control-wrapper input,
                .form-control-wrapper select {
                    width: 100%;
                    height: 42px;
                    padding: 0 12px 0 35px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 13px;
                    background-color: #f8fafc;
                    outline: none;
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                }
                .form-control-wrapper input:focus,
                .form-control-wrapper select:focus {
                    border-color: #3b82f6;
                    background-color: white;
                }
                .form-icon {
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                    pointer-events: none;
                }
                .view-toggle {
                    display: flex;
                    background: #f1f5f9;
                    padding: 4px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }
                .view-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 0 12px;
                    height: 34px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                    transition: all 0.2s;
                    color: #64748b;
                    background: transparent;
                }
                .view-btn.active {
                    background: white;
                    color: #0f172a;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                }
                @media (max-width: 1024px) {
                    .control-bar {
                        grid-template-columns: 1fr 1fr;
                    }
                    .search-area {
                        grid-column: span 2;
                        order: -1;
                    }
                }
            `}</style>

            {message && <div style={{ position: 'fixed', top: '20px', right: '20px', padding: '15px 25px', borderRadius: '8px', color: 'white', backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444', zIndex: 9999 }}>{message.text}</div>}

            {/* Modallar */}
            {showShippingModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '300px' }}>
                        <h3>Teslimat Tamamlanıyor</h3>
                        <p>Nakliye ücretini giriniz:</p>
                        <input type="number" className="form-input" value={modalShippingCost} onChange={e => setModalShippingCost(e.target.value)} />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowShippingModal(false)} className="btn btn-secondary">İptal</button>
                            <button onClick={confirmDeliveryWithShipping} className="btn btn-success">Tamamla</button>
                        </div>
                    </div>
                </div>
            )}

            {cancelModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '400px', textAlign: 'center' }}>
                        <h3 style={{ margin: 0, color: '#2c3e50' }}>Siparişi İptal Et?</h3>
                        <p>Bu işlem geri alınamaz.</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                            <button onClick={() => setCancelModal({ show: false, saleId: null })} className="btn btn-secondary">Vazgeç</button>
                            <button onClick={confirmCancelSale} className="btn" style={{ backgroundColor: '#dc2626', color: 'white' }}>Evet, İptal Et</button>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="page-header">
                <div className="page-title"><h2>Satış Listesi</h2><p>Sipariş ve Teslimat Takibi</p></div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handlePrintPDF} className="btn btn-secondary" style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {Icons.pdf} PDF Çıkar
                    </button>
                    <Link to="/sales/add" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {Icons.plus} Yeni Satış
                    </Link>
                </div>
            </div>

            {/*   MODERN KONTROL ÇUBUĞU (TEK SATIR & GÜZEL HİZALAMA) */}
            <div className="control-bar">

                {/* 1. MAĞAZA SEÇİMİ */}
                <div>
                    {isAdmin ? (
                        <div className="form-control-wrapper">
                            <span className="form-icon"><img src={StoreIcon} width="16" style={{ opacity: 0.5 }} /></span>
                            <select value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)}>
                                <option value="">-- Mağaza Seçiniz --</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div style={{ fontWeight: 'bold', padding: '10px 15px', backgroundColor: '#ecf0f1', borderRadius: '8px', color: '#2c3e50', whiteSpace: 'nowrap', height: '42px', display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                            {stores.find(s => s.id === selectedStoreId)?.storeName || "Mağazam"}
                        </div>
                    )}
                </div>

                {/* 2. ARAMA (Esnek Alan) */}
                <div className="form-control-wrapper search-area">
                    <span className="form-icon">{Icons.search}</span>
                    <input
                        type="text"
                        placeholder="Ara (Fiş No / Müşteri)..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* 3. SIRALAMA */}
                <div className="form-control-wrapper">
                    <span className="form-icon">{Icons.sort}</span>
                    <select value={sortOrder} onChange={(e: any) => setSortOrder(e.target.value)}>
                        <option value="deadline_asc">Teslim Tarihi (Yakın)</option>
                        <option value="date_desc">Kayıt Tarihi (Yeni)</option>
                        <option value="receipt_desc">Fiş No (Büyükten)</option>
                    </select>
                </div>

                {/* 4. GÖRÜNÜM DEĞİŞTİRME */}
                <div className="view-toggle">
                    <button onClick={() => setViewMode('table')} className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}>
                        {Icons.list} Liste
                    </button>
                    <button onClick={() => setViewMode('grid')} className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}>
                        {Icons.grid} Kart
                    </button>
                </div>

            </div>

            {/* TAB BUTONLARI */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button onClick={() => setActiveTab('active')} className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>Aktif Siparişler</button>
                <button onClick={() => setActiveTab('completed')} className={`btn ${activeTab === 'completed' ? 'btn-past' : 'btn-secondary'}`} style={{ flex: 1 }}>Geçmiş</button>
            </div>

            {/* İÇERİK ALANI */}
            <div className="card" style={{ backgroundColor: viewMode === 'grid' ? 'transparent' : 'white', boxShadow: viewMode === 'grid' ? 'none' : '0 2px 5px rgba(0,0,0,0.05)', border: 'none' }}>
                <div className="card-body" style={{ padding: viewMode === 'grid' ? '0' : '0' }}>
                    {selectedStoreId ? (
                        viewMode === 'table' ? (
                            <SalesTableView
                                sales={displaySales}
                                toggleRow={toggleRow}
                                expandedRowId={expandedRowId}
                                rowStockStatus={rowStockStatus}
                                formatDate={formatDate}
                                handleStatusClick={handleStatusClick}
                                isAdmin={isAdmin}
                                openCancelModal={(id) => setCancelModal({ show: true, saleId: id })}
                                goToDetail={goToDetail}
                                getCatName={getCatName}
                                getCushionName={getCushionName}
                                getColorName={getColorName}
                                getDimensionName={getDimensionName}
                                onEdit={(sale) => navigate(`/sales/${sale.storeId}/edit/${sale.id}`, { state: { sale } })}
                            />
                        ) : (
                            <SalesGridView
                                sales={displaySales}
                                formatDate={formatDate}
                                goToDetail={goToDetail}
                                //   EKSİK OLAN FONKSİYONLAR BURAYA EKLENDİ
                                getCatName={getCatName}
                                getCushionName={getCushionName}
                                getColorName={getColorName}
                                getDimensionName={getDimensionName}
                            />
                        )
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            <div style={{ marginBottom: '15px', opacity: 0.5 }}>
                                {/*   EMOJİ YERİNE IKON */}
                                <img src={StoreIcon} width="64" alt="Mağaza Seç" style={{ filter: 'grayscale(100%)', opacity: 0.6 }} />
                            </div>
                            <h3 style={{ margin: '0 0 5px 0', color: '#475569' }}>Mağaza Seçimi Yapılmadı</h3>
                            <p style={{ fontSize: '14px' }}>Lütfen işlem yapmak için yukarıdan bir mağaza seçiniz.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SaleList;