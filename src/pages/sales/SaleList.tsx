// src/pages/sales/SaleList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

import { getSalesByStore, updateSaleItemStatus } from "../../services/saleService";
import { getStores } from "../../services/storeService";
import {
    getCategories,
    getCushions,
    getColors,
    getDimensions,
    getGroups
} from "../../services/definitionService";

import type { Sale, Store, Personnel, Category, Cushion, Color, Dimension, Group, DeliveryStatus } from "../../types";
import "../../App.css";

const SaleList = () => {
    const { currentUser } = useAuth();

    // --- STATE'LER ---
    const [sales, setSales] = useState<Sale[]>([]);
    const [stores, setStores] = useState<Store[]>([]);

    // Tanımlar
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);

    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    // Açılan satırdaki ürünlerin güncel stok durumlarını tutmak için
    const [rowStockStatus, setRowStockStatus] = useState<Record<string, number>>({});

    // --- 1. BAŞLANGIÇ VERİLERİ ---
    useEffect(() => {
        const initData = async () => {
            if (!currentUser) return;
            try {
                const [storesData, grpData, catsData, cushsData, colsData, dimsData] = await Promise.all([
                    getStores(), getGroups(), getCategories(), getCushions(), getColors(), getDimensions()
                ]);
                setStores(storesData); setGroups(grpData); setCategories(catsData); setCushions(cushsData); setColors(colsData); setDimensions(dimsData);

                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data() as Personnel;
                    if (userData.role === 'admin') { setIsAdmin(true); }
                    else { setIsAdmin(false); setSelectedStoreId(userData.storeId); }
                }
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        initData();
    }, [currentUser]);

    // --- 2. SATIŞLARI ÇEK ---
    const refreshSales = async () => {
        if (!selectedStoreId) return;
        const data = await getSalesByStore(selectedStoreId);
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setSales(data);
    };

    useEffect(() => { refreshSales(); }, [selectedStoreId]);

    // --- YARDIMCILAR ---
    const formatDate = (dateString: string) => { if (!dateString) return "-"; return new Date(dateString).toLocaleDateString('tr-TR'); };
    const getCatName = (id?: string) => categories.find(c => c.id === id)?.categoryName || "";
    const getCushionName = (id?: string) => cushions.find(c => c.id === id)?.cushionName || "-";
    const getColorName = (id?: string) => colors.find(c => c.id === id)?.colorName || "-";
    const getDimensionName = (id?: string | null) => id ? (dimensions.find(d => d.id === id)?.dimensionName || "") : "";

    // --- SATIR AÇMA VE STOK KONTROLÜ ---
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
                    if (snap.exists()) {
                        stocks[uniqueId] = snap.data().reservedStock || 0;
                    } else {
                        stocks[uniqueId] = 0;
                    }
                }));
                setRowStockStatus(stocks);
            }
        }
    };

    // --- DURUM GÜNCELLEME (Butona basınca) ---
    const handleStatusClick = async (saleId: string, itemIndex: number, currentStatus: DeliveryStatus) => {
        // Eğer şu an 'Bekliyor' ise 'Teslim Edildi' yap.
        // Eğer 'Teslim Edildi' ise 'Bekliyor' yap (Geri alma).
        const newStatus: DeliveryStatus = currentStatus === 'Teslim Edildi' ? 'Bekliyor' : 'Teslim Edildi';

        try {
            await updateSaleItemStatus(selectedStoreId, saleId, itemIndex, newStatus);
            await refreshSales();
            if (expandedRowId === saleId) toggleRow(saleId);
        } catch (error: any) {
            alert("Hata: " + error.message);
        }
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
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
                                                {/* ANA SATIR */}
                                                <tr
                                                    key={s.id}
                                                    onClick={() => s.id && toggleRow(s.id)}
                                                    className="hover-row"
                                                    style={{ cursor: 'pointer', backgroundColor: expandedRowId === s.id ? '#f0fdf4' : 'white', borderBottom: expandedRowId === s.id ? 'none' : '1px solid #eee' }}
                                                >
                                                    <td style={{ textAlign: 'center', fontSize: '18px' }}>{isAllDelivered ? <span style={{ color: '#27ae60' }}>●</span> : <span style={{ color: '#e74c3c' }}>●</span>}</td>
                                                    <td>{formatDate(s.date)}</td>
                                                    <td style={{ fontWeight: '600', color: '#2c3e50' }}>{s.receiptNo}</td>
                                                    <td style={{ fontWeight: '500' }}>{s.customerName}</td>
                                                    <td style={{ fontSize: '13px', color: '#555' }}>{s.city} / {s.district}</td>
                                                    <td style={{ color: '#e67e22', fontStyle: 'italic', fontWeight: '500', fontSize: '13px' }}>{s.customerNote || "-"}</td>
                                                    <td>{s.personnelName}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#27ae60' }}>{grandTotal.toFixed(2)} ₺</td>
                                                </tr>

                                                {/* DETAY SATIRI */}
                                                {expandedRowId === s.id && (
                                                    <tr style={{ backgroundColor: '#fbfbfb', borderBottom: '2px solid #ddd' }}>
                                                        <td colSpan={8} style={{ padding: '20px' }}>
                                                            <div style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: 'white' }}>

                                                                {/* DETAY BİLGİLER */}
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '20px', marginBottom: '15px', fontSize: '13px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                                                    <div><strong>Telefon:</strong> {s.phone}</div>
                                                                    <div><strong>Adres:</strong> {s.address || "-"}</div>
                                                                    <div style={{ textAlign: 'right', color: '#e67e22' }}><strong>Nakliye:</strong> {s.shippingCost} ₺</div>
                                                                </div>

                                                                {/* ÜRÜN TABLOSU */}
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
                                                                            // Merkezden ise: Rezerve stok (gelen stok) adet kadar var mı?
                                                                            const isArrived = availableReserved >= item.quantity;
                                                                            const isDelivered = item.deliveryStatus === 'Teslim Edildi';

                                                                            // Buton Aktif mi?
                                                                            // Eğer 'Teslim Edildi' ise her zaman aktif (Geri almak için)
                                                                            // Değilse: Stoktansa aktif, Merkezdense sadece gelince aktif.
                                                                            const isActionEnabled = isDelivered || !isSupplyFromCenter || isArrived;

                                                                            return (
                                                                                <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                                                                    <td style={{ padding: '8px' }}>
                                                                                        <span style={{ fontWeight: '600', color: '#34495e', marginRight: '6px' }}>{item.productName.split('-')[0].trim()}</span>
                                                                                        {item.dimensionId && <span style={{ color: '#e67e22', fontWeight: '600', marginRight: '6px' }}>{getDimensionName(item.dimensionId)}</span>}
                                                                                        <span style={{ color: '#34495e', fontWeight: '600' }}>{getCatName(item.categoryId)}</span>
                                                                                    </td>
                                                                                    <td>{getColorName(item.colorId)}</td>
                                                                                    <td>{getCushionName(item.cushionId)}</td>
                                                                                    <td style={{ fontStyle: 'italic', color: '#777' }}>{item.productNote || "-"}</td>
                                                                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                                                                                    <td style={{ textAlign: 'right' }}>{item.price} ₺</td>

                                                                                    {/* TEMİN SÜTUNU */}
                                                                                    <td style={{ textAlign: 'center' }}>
                                                                                        {item.supplyMethod === 'Stoktan' ? (
                                                                                            <span className="badge badge-success" style={{ fontSize: '10px' }}>Stoktan</span>
                                                                                        ) : (
                                                                                            <span
                                                                                                className="badge"
                                                                                                style={{
                                                                                                    fontSize: '10px',
                                                                                                    backgroundColor: isArrived ? '#27ae60' : '#e74c3c', // Gelince Yeşil, Yoksa Kırmızı
                                                                                                    color: 'white'
                                                                                                }}
                                                                                            >
                                                                                                {isArrived ? 'Merkez' : 'Merkez'}
                                                                                            </span>
                                                                                        )}
                                                                                    </td>

                                                                                    {/* TESLİM BUTONU */}
                                                                                    <td style={{ textAlign: 'center' }}>
                                                                                        <button
                                                                                            onClick={() => handleStatusClick(s.id!, idx, item.deliveryStatus!)}
                                                                                            disabled={!isActionEnabled}
                                                                                            className={`btn ${isDelivered ? 'btn-success' : 'btn-primary'}`}
                                                                                            style={{
                                                                                                width: '100%',
                                                                                                padding: '5px 8px',
                                                                                                fontSize: '11px',
                                                                                                opacity: isActionEnabled ? 1 : 0.5,
                                                                                                cursor: isActionEnabled ? 'pointer' : 'not-allowed',
                                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                                                                                            }}
                                                                                        >
                                                                                            {isDelivered ? (
                                                                                                <>✔ Teslim Edildi</>
                                                                                            ) : (
                                                                                                <>{isActionEnabled ? 'Teslim Et' : 'Stok Bekleniyor'}</>
                                                                                            )}
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                                <div style={{ marginTop: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: '#2c3e50' }}>Genel Toplam: {grandTotal.toFixed(2)} ₺</div>
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