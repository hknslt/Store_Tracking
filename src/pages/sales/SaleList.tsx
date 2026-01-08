// src/pages/sales/SaleList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

// Servisler
import { getSalesByStore, updateSaleItemStatus } from "../../services/saleService";
import { getStores } from "../../services/storeService";

import type { Sale, Store, Personnel, DeliveryStatus } from "../../types";
import "../../App.css";

const SaleList = () => {
    const { currentUser } = useAuth();

    // --- STATE'LER ---
    const [sales, setSales] = useState<Sale[]>([]);
    const [stores, setStores] = useState<Store[]>([]);

    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    // Hangi satırın açık olduğunu tutar
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    // --- 1. BAŞLANGIÇ VERİLERİ ---
    useEffect(() => {
        const initData = async () => {
            if (!currentUser) return;

            try {
                const storesData = await getStores();
                setStores(storesData);

                // Yetki Kontrolü
                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data() as Personnel;
                    if (userData.role === 'admin') {
                        setIsAdmin(true);
                    } else {
                        setIsAdmin(false);
                        setSelectedStoreId(userData.storeId);
                    }
                }
            } catch (error) {
                console.error("Veri hatası:", error);
            } finally {
                setLoading(false);
            }
        };

        initData();
    }, [currentUser]);

    // --- 2. SATIŞLARI ÇEK ---
    useEffect(() => {
        const loadSales = async () => {
            if (!selectedStoreId) {
                setSales([]);
                return;
            }
            const data = await getSalesByStore(selectedStoreId);
            // Tarihe göre sırala (Yeniden eskiye)
            data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setSales(data);
        };

        loadSales();
    }, [selectedStoreId]);

    // --- DURUM GÜNCELLEME (Bekliyor <-> Teslim Edildi) ---
    const handleStatusChange = async (saleId: string, itemIndex: number, newStatus: DeliveryStatus) => {
        try {
            await updateSaleItemStatus(selectedStoreId, saleId, itemIndex, newStatus);

            // Listeyi yerel olarak güncelle (Tekrar çekmeye gerek kalmasın)
            const updatedSales = [...sales];
            const saleIndex = updatedSales.findIndex(s => s.id === saleId);
            if (saleIndex > -1) {
                updatedSales[saleIndex].items[itemIndex].deliveryStatus = newStatus;
                setSales(updatedSales);
            }
        } catch (error) {
            console.error(error);
            alert("Durum güncellenemedi!");
        }
    };

    const toggleRow = (id: string) => {
        setExpandedRowId(expandedRowId === id ? null : id);
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {/* --- HEADER --- */}
            <div className="page-header">
                <div className="page-title">
                    <h2>Satış Listesi</h2>
                    <p>Müşteri siparişleri ve teslimat takibi</p>
                </div>
                <Link to="/sales/add" className="btn btn-primary">
                    + Yeni Satış
                </Link>
            </div>

            {/* --- MAĞAZA SEÇİMİ (ADMİN) --- */}
            <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {isAdmin ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ fontWeight: '600', color: '#2c3e50' }}>Mağaza:</label>
                            <select
                                className="form-input"
                                value={selectedStoreId}
                                onChange={(e) => setSelectedStoreId(e.target.value)}
                                style={{ maxWidth: '300px' }}
                            >
                                <option value="">-- Seçiniz --</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div style={{ fontWeight: 'bold', color: '#2980b9', padding: '10px', backgroundColor: '#ecf0f1', borderRadius: '5px' }}>
                            📍 {stores.find(s => s.id === selectedStoreId)?.storeName || "Mağazam"}
                        </div>
                    )}
                </div>
            </div>

            {/* --- ANA TABLO --- */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {selectedStoreId ? (
                        <table className="data-table">
                            <thead>
                                <tr style={{ backgroundColor: '#f8f9fa' }}>
                                    <th style={{ width: '5%' }}></th>
                                    <th style={{ width: '10%' }}>Tarih</th>
                                    <th style={{ width: '15%' }}>Fiş No</th>
                                    <th style={{ width: '20%' }}>Müşteri Adı</th>
                                    <th style={{ width: '20%' }}>Termin / Not</th>
                                    <th style={{ width: '15%' }}>Personel</th>
                                    <th style={{ width: '15%', textAlign: 'right' }}>Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.length > 0 ? (
                                    sales.map(s => (
                                        <>
                                            {/* ANA SATIR */}
                                            <tr
                                                key={s.id}
                                                onClick={() => s.id && toggleRow(s.id)}
                                                className="hover-row"
                                                style={{
                                                    cursor: 'pointer',
                                                    backgroundColor: expandedRowId === s.id ? '#e8f6f3' : 'white',
                                                    borderBottom: expandedRowId === s.id ? 'none' : '1px solid #eee'
                                                }}
                                            >
                                                <td style={{ textAlign: 'center', fontSize: '16px', color: '#3498db' }}>
                                                    {expandedRowId === s.id ? '▼' : '▶'}
                                                </td>
                                                <td>{new Date(s.date).toLocaleDateString('tr-TR')}</td>
                                                <td style={{ fontWeight: '600', color: '#2c3e50' }}>{s.receiptNo}</td>
                                                <td>
                                                    <div style={{ fontWeight: '500' }}>{s.customerName}</div>
                                                    <div style={{ fontSize: '11px', color: '#7f8c8d' }}>{s.city} / {s.district}</div>
                                                </td>
                                                {/* Termin Notu */}
                                                <td style={{ color: '#e67e22', fontStyle: 'italic', fontWeight: '500' }}>
                                                    {s.customerNote || "-"}
                                                </td>
                                                <td>{s.personnelName}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#27ae60' }}>
                                                    {s.grandTotal.toFixed(2)} ₺
                                                </td>
                                            </tr>

                                            {/* DETAY SATIRI (AÇILIR KAPANIR) */}
                                            {expandedRowId === s.id && (
                                                <tr style={{ backgroundColor: '#fbfbfb', borderBottom: '2px solid #ddd' }}>
                                                    <td colSpan={7} style={{ padding: '20px' }}>

                                                        {/* MÜŞTERİ DETAYLARI */}
                                                        <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee', color: '#555', fontSize: '13px' }}>
                                                            <div style={{ display: 'flex', gap: '20px' }}>
                                                                <div><strong>Telefon:</strong> {s.phone}</div>
                                                                <div style={{ flex: 1 }}><strong>Adres:</strong> {s.address || "Adres girilmemiş."}</div>
                                                            </div>
                                                        </div>

                                                        {/* ÜRÜN TABLOSU */}
                                                        <table className="data-table dense" style={{ border: '1px solid #eee', backgroundColor: 'white' }}>
                                                            <thead>
                                                                <tr style={{ backgroundColor: '#f1f2f6' }}>
                                                                    <th style={{ width: '30%' }}>Ürün Bilgisi</th>
                                                                    <th style={{ width: '20%' }}>Ürün Notu</th>
                                                                    <th style={{ textAlign: 'center' }}>Adet</th>
                                                                    <th style={{ textAlign: 'center' }}>Temin</th>
                                                                    <th style={{ width: '160px' }}>Teslim Durumu</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {s.items.map((item, idx) => (
                                                                    <tr key={idx}>
                                                                        <td style={{ fontWeight: '500' }}>{item.productName}</td>

                                                                        {/* Ürün Notu */}
                                                                        <td style={{ fontStyle: 'italic', color: '#777' }}>
                                                                            {item.productNote || "-"}
                                                                        </td>

                                                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>

                                                                        {/* Temin Yöntemi */}
                                                                        <td style={{ textAlign: 'center' }}>
                                                                            <span className={`badge ${item.supplyMethod === 'Stoktan' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                                                                                {item.supplyMethod}
                                                                            </span>
                                                                        </td>

                                                                        {/* TESLİM DURUMU SEÇİMİ */}
                                                                        <td>
                                                                            <select
                                                                                value={item.deliveryStatus || 'Bekliyor'}
                                                                                onChange={(e) => handleStatusChange(s.id!, idx, e.target.value as DeliveryStatus)}
                                                                                className="form-input input-sm"
                                                                                style={{
                                                                                    backgroundColor: item.deliveryStatus === 'Teslim Edildi' ? '#27ae60' : '#f39c12',
                                                                                    color: 'white',
                                                                                    border: 'none',
                                                                                    fontWeight: 'bold',
                                                                                    cursor: 'pointer',
                                                                                    height: '28px',
                                                                                    padding: '0 5px'
                                                                                }}
                                                                            >
                                                                                <option value="Bekliyor" style={{ backgroundColor: 'white', color: 'black' }}>Bekliyor</option>
                                                                                <option value="Teslim Edildi" style={{ backgroundColor: 'white', color: 'black' }}>Teslim Edildi</option>
                                                                            </select>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                                            Bu mağazaya ait satış kaydı bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#95a5a6' }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏬</div>
                            <p>Satışları görüntülemek için lütfen yukarıdan bir mağaza seçiniz.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SaleList;