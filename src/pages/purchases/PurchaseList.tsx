// src/pages/purchases/PurchaseList.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

// Servisler
import { getPurchasesByStore, updatePurchaseItemStatus, cancelPurchaseComplete } from "../../services/purchaseService";
import { getStores } from "../../services/storeService";
import { getCategories, getCushions, getColors, getDimensions } from "../../services/definitionService";
import { generatePurchasePDF } from "../../services/pdfService";

// Bileşenler
import PurchasesTableView from "../../components/purchases/PurchasesTableView";
import PurchasesGridView from "../../components/purchases/PurchasesGridView";

import type { Purchase, Store, SystemUser, Category, Cushion, Color, Dimension, PurchaseStatus } from "../../types";
import "../../App.css";
import StoreIcon from "../../assets/icons/store.svg";

// İKONLAR
const Icons = {
    pdf: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
    plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    list: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
    grid: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
    search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    sort: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>,
    filter: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
    check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
};

const PurchaseList = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Veri State'leri
    const [purchases, setPurchases] = useState<Purchase[]>([]);
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
    const [sortOrder, setSortOrder] = useState<'date_desc' | 'date_asc' | 'receipt_desc'>('date_desc');
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

    // ÇOKLU DURUM FİLTRESİ
    const [selectedStatuses, setSelectedStatuses] = useState<PurchaseStatus[]>(['Beklemede', 'Onaylandı', 'Üretim', 'Sevkiyat']);

    // Modal State
    const [cancelModal, setCancelModal] = useState<{ show: boolean, id: string | null }>({ show: false, id: null });
    const [searchTerm, setSearchTerm] = useState("");
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // --- VERİ ÇEKME ---
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
                    const u = userDoc.data() as SystemUser;
                    if (['admin', 'control', 'report'].includes(u.role)) { setIsAdmin(true); }
                    else { setIsAdmin(false); if (u.storeId) setSelectedStoreId(u.storeId); }
                }
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        init();
    }, [currentUser]);

    const refreshPurchases = async () => {
        if (!selectedStoreId) return;
        const data = await getPurchasesByStore(selectedStoreId);
        setPurchases(data);
    };
    useEffect(() => { refreshPurchases(); }, [selectedStoreId]);

    const toggleStatusFilter = (status: PurchaseStatus) => {
        setSelectedStatuses(prev =>
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
    };

    // --- FİLTRELEME MANTIĞI ---
    const getProcessedPurchases = () => {
        let filtered = purchases.filter(p => {
            const matchesSearch = p.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) || p.items.some(i => i.productName.toLowerCase().includes(searchTerm.toLowerCase()));
            if (!matchesSearch) return false;

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

        if (sortOrder === 'date_desc') {
            filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } else if (sortOrder === 'date_asc') {
            filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        } else if (sortOrder === 'receipt_desc') {
            filtered.sort((a, b) => b.receiptNo.localeCompare(a.receiptNo, undefined, { numeric: true }));
        }

        return filtered;
    };

    const displayPurchases = getProcessedPurchases();

    // --- YARDIMCI FONKSİYONLAR ---
    const formatDate = (dateString: string) => (!dateString ? "-" : new Date(dateString).toLocaleDateString('tr-TR'));
    const getCatName = (id?: string) => categories.find(c => c.id === id)?.categoryName || "";
    const getCushionName = (id?: string) => cushions.find(c => c.id === id)?.cushionName || "-";
    const getColorName = (id?: string) => colors.find(c => c.id === id)?.colorName || "-";
    const getDimensionName = (id?: string | null) => id ? (dimensions.find(d => d.id === id)?.dimensionName || "") : "";
    const toggleRow = (id: string) => setExpandedRowId(expandedRowId === id ? null : id);
    const goToDetail = (purchase: Purchase) => { if (purchase.id && selectedStoreId) { navigate(`/purchases/${selectedStoreId}/${purchase.id}`, { state: { purchase } }); } };

    const getNextStatus = (current: PurchaseStatus): PurchaseStatus | null => { switch (current) { case 'Beklemede': return 'Onaylandı'; case 'Onaylandı': return 'Üretim'; case 'Üretim': return 'Sevkiyat'; case 'Sevkiyat': return 'Tamamlandı'; default: return null; } };
    const getButtonText = (current: PurchaseStatus) => { switch (current) { case 'Beklemede': return 'Onayla'; case 'Onaylandı': return 'Üretime Al'; case 'Üretim': return 'Sevkiyata Al'; case 'Sevkiyat': return 'Teslim Al'; case 'Tamamlandı': return '✔ Tamamlandı'; default: return current; } };
    const getButtonColor = (current: PurchaseStatus) => { switch (current) { case 'Beklemede': return 'btn-primary'; case 'Onaylandı': return 'btn-warning'; case 'Üretim': return 'btn-secondary'; case 'Sevkiyat': return 'btn-success'; case 'Tamamlandı': return 'btn-secondary'; default: return 'btn-secondary'; } };

    // İşlemler
    const handleStatusClick = async (purchaseId: string, itemIndex: number, currentStatus: PurchaseStatus) => { const nextStatus = getNextStatus(currentStatus); if (!nextStatus) return; try { await updatePurchaseItemStatus(selectedStoreId, purchaseId, itemIndex, nextStatus); await refreshPurchases(); } catch (error) { console.error(error); alert("Durum güncellenemedi!"); } };
    const confirmCancel = async () => { if (!cancelModal.id) return; try { setLoading(true); await cancelPurchaseComplete(selectedStoreId, cancelModal.id); setMessage({ type: 'success', text: "Alış fişi iptal edildi." }); await refreshPurchases(); } catch (error) { setMessage({ type: 'error', text: "İptal edilemedi." }); } finally { setLoading(false); setCancelModal({ show: false, id: null }); } };

    // PDF ÇIKTISI
    const handlePrintPDF = () => {
        const storeName = stores.find(s => s.id === selectedStoreId)?.storeName || "Magaza";
        generatePurchasePDF(displayPurchases, storeName, categories, cushions, colors, dimensions);
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    // 🔥 TASARIM: Modern Filtre Kapsülleri (Chips)
    const StatusFilterChip = ({ status, label, color }: { status: PurchaseStatus, label: string, color: string }) => {
        const isSelected = selectedStatuses.includes(status);
        return (
            <button
                onClick={() => toggleStatusFilter(status)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '30px',
                    border: isSelected ? `1px solid ${color}` : '1px solid #e2e8f0',
                    backgroundColor: isSelected ? `${color}15` : 'white', // Hafif transparan arka plan
                    color: isSelected ? color : '#64748b',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    boxShadow: isSelected ? `0 2px 8px ${color}30` : '0 1px 2px rgba(0,0,0,0.03)'
                }}
            >
                {isSelected && <span>{Icons.check}</span>}
                {label}
            </button>
        );
    };

    return (
        <div className="page-container">
            {/* CSS STİLLERİ */}
            <style>{`
                .control-bar { display: grid; grid-template-columns: 220px 1fr 200px auto; gap: 15px; alignItems: center; background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.03); marginBottom: 15px; }
                .form-control-wrapper { position: relative; width: 100%; }
                .form-control-wrapper input, .form-control-wrapper select { width: 100%; height: 42px; padding: 0 12px 0 35px; border: 1px solid #e2e8f0; border-radius: 8px; fontSize: 13px; background-color: #f8fafc; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
                .form-control-wrapper input:focus, .form-control-wrapper select:focus { border-color: #3b82f6; background-color: white; }
                .form-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
                .view-toggle { display: flex; background: #f1f5f9; padding: 4px; border-radius: 8px; border: 1px solid #e2e8f0; }
                .view-btn { display: flex; align-items: center; gap: 6px; padding: 0 12px; height: 34px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; color: #64748b; background: transparent; }
                .view-btn.active { background: white; color: #0f172a; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
                .filter-bar { display: flex; gap: 10px; flex-wrap: wrap; padding: 10px 0; align-items: center; }
                @media (max-width: 1024px) { .control-bar { grid-template-columns: 1fr 1fr; } .search-area { grid-column: span 2; order: -1; } }
            `}</style>

            {message && <div style={{ position: 'fixed', top: '20px', right: '20px', padding: '15px 25px', borderRadius: '8px', color: 'white', backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444', zIndex: 9999 }}>{message.text}</div>}

            {/* İPTAL MODALI */}
            {cancelModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '350px', textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 10px 0' }}>Emin misiniz?</h3>
                        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>Fiş iptal edilecek ve stoklar (varsa) geri alınacak.</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                            <button onClick={() => setCancelModal({ show: false, id: null })} className="btn btn-secondary">Vazgeç</button>
                            <button onClick={confirmCancel} className="btn btn-danger">Evet, İptal Et</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div className="page-title"><h2>Alış İşlemleri</h2><p>Depo Stok Girişleri ve Sipariş Tedarikleri</p></div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handlePrintPDF} className="btn btn-secondary" style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {Icons.pdf} PDF Çıkar
                    </button>
                    <Link to="/purchases/add" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {Icons.plus} Yeni Alış
                    </Link>
                </div>
            </div>

            {/* 🔥 MODERN KONTROL ÇUBUĞU */}
            <div className="control-bar">
                <div>
                    {isAdmin ? (
                        <div className="form-control-wrapper">
                            <span className="form-icon"><img src={StoreIcon} width="16" style={{ opacity: 0.5 }} /></span>
                            <select value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)}>
                                <option value="">-- Mağaza Seçiniz --</option>{stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div style={{ fontWeight: 'bold', padding: '10px 15px', backgroundColor: '#ecf0f1', borderRadius: '8px', color: '#2c3e50', whiteSpace: 'nowrap', height: '42px', display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0' }}>{stores.find(s => s.id === selectedStoreId)?.storeName || "Mağazam"}</div>
                    )}
                </div>

                <div className="form-control-wrapper search-area">
                    <span className="form-icon">{Icons.search}</span>
                    <input type="text" placeholder="Fiş No veya Ürün Ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>

                <div className="form-control-wrapper">
                    <span className="form-icon">{Icons.sort}</span>
                    <select value={sortOrder} onChange={(e: any) => setSortOrder(e.target.value)}>
                        <option value="date_desc">Tarih: Yeni Önce</option>
                        <option value="date_asc">Tarih: Eski Önce</option>
                        <option value="receipt_desc">Fiş No: Büyükten Küçüğe</option>
                    </select>
                </div>

                <div className="view-toggle">
                    <button onClick={() => setViewMode('table')} className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}>{Icons.list} Liste</button>
                    <button onClick={() => setViewMode('grid')} className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}>{Icons.grid} Kart</button>
                </div>
            </div>

            {/* 🔥 MODERN FİLTRE ÇUBUĞU (ŞIK TASARIM) */}
            {activeTab === 'active' && (
                <div className="filter-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#475569', marginRight: '10px' }}>
                        {Icons.filter} DURUM FİLTRESİ:
                    </div>
                    <StatusFilterChip status="Beklemede" label="Beklemede" color="#3b82f6" />
                    <StatusFilterChip status="Onaylandı" label="Onaylandı" color="#f59e0b" />
                    <StatusFilterChip status="Üretim" label="Üretimde" color="#8b5cf6" />
                    <StatusFilterChip status="Sevkiyat" label="Sevkiyatta" color="#10b981" />
                </div>
            )}

            {/* TAB BUTONLARI */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', marginTop: '10px' }}>
                <button onClick={() => setActiveTab('active')} className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>Devam Eden Siparişler</button>
                <button onClick={() => setActiveTab('completed')} className={`btn ${activeTab === 'completed' ? 'btn-past' : 'btn-secondary'}`} style={{ flex: 1 }}>Tamamlananlar (Geçmiş)</button>
            </div>

            {/* İÇERİK ALANI */}
            <div className="card" style={{ backgroundColor: viewMode === 'grid' ? 'transparent' : 'white', boxShadow: viewMode === 'grid' ? 'none' : '0 2px 5px rgba(0,0,0,0.05)', border: 'none' }}>
                <div className="card-body" style={{ padding: viewMode === 'grid' ? '0' : '0' }}>
                    {selectedStoreId ? (
                        viewMode === 'table' ? (
                            <PurchasesTableView
                                purchases={displayPurchases}
                                toggleRow={toggleRow}
                                expandedRowId={expandedRowId}
                                formatDate={formatDate}
                                handleStatusClick={handleStatusClick}
                                getButtonText={getButtonText}
                                getButtonColor={getButtonColor}
                                isAdmin={isAdmin}
                                setCancelModal={setCancelModal}
                                goToDetail={goToDetail}
                                getCatName={getCatName}
                                getCushionName={getCushionName}
                                getColorName={getColorName}
                                getDimensionName={getDimensionName}
                            />
                        ) : (
                            <PurchasesGridView
                                purchases={displayPurchases}
                                formatDate={formatDate}
                                goToDetail={goToDetail}
                                handleStatusClick={handleStatusClick}
                                getButtonText={getButtonText}
                                getButtonColor={getButtonColor}
                                getCatName={getCatName}
                                getCushionName={getCushionName}
                                getColorName={getColorName}
                                getDimensionName={getDimensionName}
                            />
                        )
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            <div style={{ marginBottom: '15px', opacity: 0.5 }}>
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

export default PurchaseList;