// src/pages/sales/SaleList.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

import { getSalesByStore, updateSaleItemStatus, updateShippingCost } from "../../services/saleService";
import { getStores } from "../../services/storeService";
import {
    getCategories,
    getCushions,
    getColors,
    getDimensions,
    getGroups
} from "../../services/definitionService";

import type { Sale, Store, SystemUser, Category, Cushion, Color, Dimension, Group, DeliveryStatus } from "../../types";
import "../../App.css";

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

    // 👇 MODAL STATE (PROMPT YERİNE)
    const [showShippingModal, setShowShippingModal] = useState(false);
    const [pendingDelivery, setPendingDelivery] = useState<{ saleId: string, itemIndex: number } | null>(null);
    const [modalShippingCost, setModalShippingCost] = useState<number>(0);

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
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setSales(data);
    };

    useEffect(() => { refreshSales(); }, [selectedStoreId]);

    // Yardımcılar
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

    // 👇 BUTONA TIKLAYINCA ÇALIŞAN FONKSİYON
    const handleStatusClick = async (sale: Sale, itemIndex: number, currentStatus: DeliveryStatus) => {
        if (currentStatus === 'Teslim Edildi') return; // Zaten teslim edildiyse işlem yapma

        // Kontrol: Bu son teslim edilmemiş ürün mü?
        const remainingItems = sale.items.filter((item, idx) => idx !== itemIndex && item.deliveryStatus !== 'Teslim Edildi');

        if (remainingItems.length === 0) {
            // EVET, SON ÜRÜN. MODAL AÇALIM.
            setPendingDelivery({ saleId: sale.id!, itemIndex });
            setModalShippingCost(sale.shippingCost); // Mevcut tutarı getir
            setShowShippingModal(true);
        } else {
            // HAYIR, DAHA ÜRÜN VAR. DİREKT GÜNCELLE.
            try {
                await updateSaleItemStatus(selectedStoreId, sale.id!, itemIndex, 'Teslim Edildi');
                await refreshSales();
                if (expandedRowId === sale.id) toggleRow(sale.id!);
            } catch (error: any) {
                alert("Hata: " + error.message);
            }
        }
    };

    // 👇 MODALDA "KAYDET" DEYİNCE ÇALIŞAN FONKSİYON
    const confirmDeliveryWithShipping = async () => {
        if (!pendingDelivery) return;

        try {
            // 1. Ürün durumunu güncelle
            await updateSaleItemStatus(selectedStoreId, pendingDelivery.saleId, pendingDelivery.itemIndex, 'Teslim Edildi');

            // 2. Nakliye ücretini güncelle
            await updateShippingCost(selectedStoreId, pendingDelivery.saleId, Number(modalShippingCost));

            // 3. Modalı kapat ve yenile
            setShowShippingModal(false);
            setPendingDelivery(null);
            await refreshSales();

            // Detay açıksa stokları yenilemek için toggle yap
            if (expandedRowId === pendingDelivery.saleId) toggleRow(pendingDelivery.saleId);

        } catch (error: any) {
            alert("İşlem sırasında hata: " + error.message);
        }
    };

    const goToDetail = (sale: Sale) => {
        if (sale.id && selectedStoreId) {
            navigate(`/sales/${selectedStoreId}/${sale.id}`, { state: { sale } });
        }
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {/* 👇 ÖZEL MODAL (PROMPT YERİNE) */}
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
                            onChange={e => setModalShippingCost(Number(e.target.value))}
                            autoFocus
                        />

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowShippingModal(false)} className="btn btn-secondary">İptal</button>
                            <button onClick={confirmDeliveryWithShipping} className="btn btn-success">Tamamla & Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div className="page-title"><h2>Satış Listesi</h2><p>Sipariş ve Teslimat Takibi</p></div>
                <Link to="/sales/add" className="btn btn-primary">+ Yeni Satış</Link>
            </div>

            <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <label style={{ fontWeight: '600', color: '#2c3e50' }}>Mağaza Seçiniz:</label>
                    {isAdmin ? (
                        <select className="form-input" value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)} style={{ maxWidth: '300px' }}>
                            <option value="">-- Seçiniz --</option>{stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                        </select>
                    ) : (
                        <div style={{ fontWeight: 'bold', color: '#2980b9', padding: '10px', backgroundColor: '#ecf0f1', borderRadius: '5px' }}>
                            📍 {stores.find(s => s.id === selectedStoreId)?.storeName || "Mağazam"}
                        </div>
                    )}
                </div>
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
                                    <th style={{ width: '15%' }}>İl / İlçe</th>
                                    <th style={{ width: '15%' }}>Termin / Not</th>
                                    <th style={{ width: '12%' }}>Personel</th>
                                    <th style={{ width: '13%', textAlign: 'right' }}>Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.length > 0 ? (
                                    sales.map(s => {
                                        const itemsTotal = s.items.reduce((acc, item) => acc + ((item.price - (item.discount || 0)) * item.quantity), 0);
                                        const grandTotal = itemsTotal + (s.shippingCost || 0);
                                        const isAllDelivered = s.items.every(i => i.deliveryStatus === 'Teslim Edildi');

                                        return (
                                            <>
                                                <tr key={s.id} onClick={() => s.id && toggleRow(s.id)} className="hover-row" style={{ cursor: 'pointer', backgroundColor: expandedRowId === s.id ? '#f0fdf4' : 'white', borderBottom: expandedRowId === s.id ? 'none' : '1px solid #eee' }}>
                                                    <td style={{ textAlign: 'center', fontSize: '18px' }}>{isAllDelivered ? <span style={{ color: '#27ae60' }}>●</span> : <span style={{ color: '#e74c3c' }}>●</span>}</td>
                                                    <td>{formatDate(s.date)}</td>
                                                    <td style={{ fontWeight: '600', color: '#2c3e50' }}>{s.receiptNo}</td>
                                                    <td style={{ fontWeight: '500' }}>{s.customerName}</td>
                                                    <td style={{ fontSize: '13px', color: '#555' }}>{s.city} / {s.district}</td>
                                                    <td style={{ color: '#e67e22', fontStyle: 'italic', fontWeight: '500', fontSize: '13px' }}>{s.customerNote || "-"}</td>
                                                    <td>{s.personnelName}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#27ae60' }}>{grandTotal.toFixed(2)} ₺</td>
                                                </tr>

                                                {expandedRowId === s.id && (
                                                    <tr style={{ backgroundColor: '#fbfbfb', borderBottom: '2px solid #ddd' }}>
                                                        <td colSpan={8} style={{ padding: '20px' }}>
                                                            <div style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: 'white' }}>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '20px', marginBottom: '15px', fontSize: '13px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '10px', alignItems: 'center' }}>
                                                                    <div><strong>Telefon:</strong> {s.phone}</div>
                                                                    <div><strong>Adres:</strong> {s.address || "-"}</div>
                                                                    <div style={{ textAlign: 'right' }}>
                                                                        <button onClick={(e) => { e.stopPropagation(); goToDetail(s); }} className="btn btn-sm btn-info" style={{ fontSize: '12px', padding: '5px 10px' }}>🔍 Satış Detayına Git</button>
                                                                    </div>
                                                                </div>

                                                                <table className="data-table dense" style={{ border: '1px solid #eee', backgroundColor: 'white', fontSize: '13px' }}>
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
                                                                            const isSupplyFromCenter = item.supplyMethod === 'Merkezden';
                                                                            const isArrived = availableReserved >= item.quantity;
                                                                            const isDelivered = item.deliveryStatus === 'Teslim Edildi';
                                                                            const isActionEnabled = !isDelivered && (!isSupplyFromCenter || isArrived);

                                                                            // RENK: Teslim edildiyse GRİ
                                                                            const badgeColor = isDelivered ? '#95a5a6' : (item.supplyMethod === 'Stoktan' || isArrived ? '#27ae60' : '#e74c3c');

                                                                            return (
                                                                                <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9', backgroundColor: isDelivered ? '#fdfdfd' : 'inherit' }}>
                                                                                    <td style={{ padding: '8px', opacity: isDelivered ? 0.6 : 1 }}>
                                                                                        <span style={{ fontWeight: '600', color: '#34495e', marginRight: '6px' }}>{item.productName.split('-')[0].trim()}</span>
                                                                                        {item.dimensionId && <span style={{ color: '#e67e22', fontWeight: '600', marginRight: '6px' }}>{getDimensionName(item.dimensionId)}</span>}
                                                                                        <span style={{ color: '#34495e', fontWeight: '600' }}>{getCatName(item.categoryId)}</span>
                                                                                    </td>
                                                                                    <td style={{ opacity: isDelivered ? 0.6 : 1 }}>{getColorName(item.colorId)}</td>
                                                                                    <td style={{ opacity: isDelivered ? 0.6 : 1 }}>{getCushionName(item.cushionId)}</td>
                                                                                    <td style={{ fontStyle: 'italic', color: '#777', opacity: isDelivered ? 0.6 : 1 }}>{item.productNote || "-"}</td>
                                                                                    <td style={{ textAlign: 'center', fontWeight: 'bold', opacity: isDelivered ? 0.6 : 1 }}>{item.quantity}</td>
                                                                                    <td style={{ textAlign: 'right', opacity: isDelivered ? 0.6 : 1 }}>{item.price} ₺</td>
                                                                                    <td style={{ textAlign: 'center' }}>
                                                                                        <span className="badge" style={{ fontSize: '10px', backgroundColor: badgeColor, color: 'white' }}>
                                                                                            {item.supplyMethod === 'Stoktan' ? 'Stoktan' : (isArrived ? 'Merkez' : 'Merkez')}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td style={{ textAlign: 'center' }}>
                                                                                        <button
                                                                                            onClick={() => handleStatusClick(s, idx, item.deliveryStatus!)}
                                                                                            disabled={!isActionEnabled}
                                                                                            className={`btn ${isDelivered ? 'btn-secondary' : 'btn-primary'}`}
                                                                                            style={{
                                                                                                width: '100%', padding: '5px 8px', fontSize: '11px',
                                                                                                opacity: isActionEnabled ? 1 : 0.6,
                                                                                                cursor: isActionEnabled ? 'pointer' : 'not-allowed',
                                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                                                                                                backgroundColor: isDelivered ? '#95a5a6' : undefined,
                                                                                                borderColor: isDelivered ? '#95a5a6' : undefined
                                                                                            }}
                                                                                        >
                                                                                            {isDelivered ? <>✔ Teslim Edildi</> : <>{isActionEnabled ? 'Teslim Et' : 'Stok Bekleniyor'}</>}
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>

                                                                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '30px', alignItems: 'center', fontSize: '14px', color: '#2c3e50', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        <span style={{ color: '#7f8c8d' }}>Nakliye:</span>
                                                                        <b>{s.shippingCost} ₺</b>
                                                                    </div>
                                                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#27ae60' }}>
                                                                        Genel Toplam: {grandTotal.toFixed(2)} ₺
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Satış kaydı bulunamadı.</td></tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#95a5a6' }}><div style={{ fontSize: '40px', marginBottom: '10px' }}>🏬</div><p>Lütfen mağaza seçiniz.</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SaleList;