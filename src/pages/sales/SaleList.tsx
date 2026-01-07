// src/pages/sales/SaleList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

import { getSalesByStore } from "../../services/saleService";
import { getStores } from "../../services/storeService";
// Tanımları çekiyoruz (Ebat eklendi)
import {
    getCategories,
    getCushions,
    getColors,
    getDimensions,
    getGroups
} from "../../services/definitionService";

import type { Sale, Store, Personnel, Category, Cushion, Color, Dimension, Group } from "../../types";
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
    const [dimensions, setDimensions] = useState<Dimension[]>([]); // YENİ

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
                // Paralel veri çekme
                const [storesData, grpData, catsData, cushsData, colsData, dimsData] = await Promise.all([
                    getStores(),
                    getGroups(),
                    getCategories(),
                    getCushions(),
                    getColors(),
                    getDimensions() // Ebatları çekiyoruz
                ]);

                setStores(storesData);
                setGroups(grpData);
                setCategories(catsData);
                setCushions(cushsData);
                setColors(colsData);
                setDimensions(dimsData);

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

    // --- YARDIMCILAR ---
    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR');
    };

    // İsim Bulucular
    const getCatName = (id?: string) => categories.find(c => c.id === id)?.categoryName || "";
    const getCushionName = (id?: string) => cushions.find(c => c.id === id)?.cushionName || "-";
    const getColorName = (id?: string) => colors.find(c => c.id === id)?.colorName || "-";
    const getDimensionName = (id?: string | null) => id ? (dimensions.find(d => d.id === id)?.dimensionName || "") : "";

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
                    <p>Müşteri siparişleri ve satış hareketleri</p>
                </div>
                <Link to="/sales/add" className="btn btn-primary">
                    + Yeni Satış Gir
                </Link>
            </div>

            {/* --- FİLTRE --- */}
            <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <label style={{ fontWeight: '600', color: '#2c3e50' }}>Mağaza Seçiniz:</label>
                    {isAdmin ? (
                        <select
                            className="form-input"
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                            style={{ maxWidth: '300px' }}
                        >
                            <option value="">-- Seçiniz --</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                        </select>
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
                        <table className="data-table dense">
                            <thead>
                                <tr style={{ backgroundColor: '#f8f9fa' }}>
                                    <th style={{ width: '5%' }}>Detay</th>
                                    <th style={{ width: '10%' }}>Tarih</th>
                                    <th style={{ width: '15%' }}>Fiş No</th>
                                    <th style={{ width: '20%' }}>Müşteri Adı</th>
                                    <th style={{ width: '15%' }}>İl / İlçe</th>
                                    <th style={{ width: '15%' }}>Telefon</th>
                                    <th style={{ width: '20%', textAlign: 'right' }}>Toplam Tutar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.length > 0 ? (
                                    sales.map(s => {
                                        // Toplam tutarı satış satırlarından hesapla (Nakliye hariç ürün toplamı + Nakliye)
                                        const itemsTotal = s.items.reduce((acc, item) => acc + ((item.price - (item.discount || 0)) * item.quantity), 0);
                                        const grandTotal = itemsTotal + (s.shippingCost || 0);

                                        return (
                                            <>
                                                {/* ANA SATIR */}
                                                <tr
                                                    key={s.id}
                                                    onClick={() => s.id && toggleRow(s.id)}
                                                    style={{
                                                        cursor: 'pointer',
                                                        backgroundColor: expandedRowId === s.id ? '#e8f6f3' : 'white',
                                                        borderBottom: expandedRowId === s.id ? 'none' : '1px solid #eee'
                                                    }}
                                                    className="hover-row"
                                                >
                                                    <td style={{ textAlign: 'center', fontSize: '16px', color: '#3498db' }}>
                                                        {expandedRowId === s.id ? '▼' : '▶'}
                                                    </td>
                                                    <td>{formatDate(s.date)}</td>
                                                    <td style={{ fontWeight: '600', color: '#2c3e50' }}>{s.receiptNo}</td>
                                                    <td style={{ fontWeight: '500' }}>{s.customerName}</td>
                                                    <td style={{ fontSize: '12px', color: '#7f8c8d' }}>{s.city} / {s.district}</td>
                                                    <td>{s.phone}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#27ae60' }}>
                                                        {grandTotal.toFixed(2)} ₺
                                                    </td>
                                                </tr>

                                                {/* DETAY SATIRI (AÇILIR KAPANIR) */}
                                                {expandedRowId === s.id && (
                                                    <tr style={{ backgroundColor: '#fbfbfb', borderBottom: '2px solid #ddd' }}>
                                                        <td colSpan={7} style={{ padding: '15px 20px' }}>
                                                            <div style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: 'white' }}>

                                                                {/* DETAY ÜST BİLGİLER */}
                                                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '15px', fontSize: '13px', color: '#555' }}>
                                                                    <div>
                                                                        <strong>Adres:</strong> {s.address || "-"}
                                                                    </div>
                                                                    <div>
                                                                        <strong>Müşteri Açıklama:</strong> {s.customerNote || "-"}
                                                                    </div>
                                                                    <div>
                                                                        <strong>Personel:</strong> {s.personnelName}
                                                                    </div>
                                                                </div>

                                                                {/* ÜRÜN TABLOSU */}
                                                                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', border: '1px solid #eee' }}>
                                                                    <thead>
                                                                        <tr style={{ backgroundColor: '#f1f2f6', color: '#2c3e50', textAlign: 'left' }}>
                                                                            <th style={{ padding: 8, width: '25%' }}>Ürün Bilgisi</th>
                                                                            <th style={{ padding: 8 }}>Renk</th>
                                                                            <th style={{ padding: 8 }}>Minder</th>
                                                                            <th style={{ padding: 8 }}>Açıklama</th>
                                                                            <th style={{ padding: 8 }}>Durum</th>
                                                                            <th style={{ padding: 8, textAlign: 'center' }}>Adet</th>
                                                                            <th style={{ padding: 8, textAlign: 'right' }}>Fiyat</th>
                                                                            <th style={{ padding: 8, textAlign: 'right' }}>İsk.</th>
                                                                            <th style={{ padding: 8, textAlign: 'right' }}>Tutar</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {s.items.map((item, idx) => {
                                                                            const lineTotal = (item.price - (item.discount || 0)) * item.quantity;
                                                                            return (
                                                                                <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>

                                                                                    {/* Ürün + Ebat + Kategori (YENİ FORMAT) */}
                                                                                    <td style={{ padding: 8 }}>
                                                                                        {/* 1. Ürün Adı */}
                                                                                        <span style={{ fontWeight: '600', color: '#34495e', marginRight: '5px' }}>
                                                                                            {item.productName.split('-')[0].trim()}
                                                                                        </span>

                                                                                        {/* 2. Ebat (Varsa) - Turuncu Renk */}
                                                                                        {item.dimensionId && (
                                                                                            <span style={{ color: '#e67e22', fontWeight: 'bold', marginRight: '5px' }}>
                                                                                                {getDimensionName(item.dimensionId)}
                                                                                            </span>
                                                                                        )}

                                                                                        {/* 3. Kategori - Gri Renk (Yanına eklendi) */}
                                                                                        <span style={{ color: '#95a5a6', fontSize: '12px', fontStyle: 'italic' }}>
                                                                                            {getCatName(item.categoryId)}
                                                                                        </span>
                                                                                    </td>

                                                                                    <td style={{ padding: 8 }}>{getColorName(item.colorId)}</td>
                                                                                    <td style={{ padding: 8 }}>{getCushionName(item.cushionId)}</td>
                                                                                    <td style={{ padding: 8, fontStyle: 'italic', color: '#999' }}>{item.productNote || "-"}</td>

                                                                                    <td style={{ padding: 8 }}>
                                                                                        <span className={`badge ${item.status === 'İptal' || item.status === 'İade' ? 'badge-danger' : 'badge-success'}`}>
                                                                                            {item.status}
                                                                                        </span>
                                                                                    </td>

                                                                                    <td style={{ padding: 8, textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                                                                                    <td style={{ padding: 8, textAlign: 'right' }}>{item.price} ₺</td>
                                                                                    <td style={{ padding: 8, textAlign: 'right', color: 'red' }}>{item.discount > 0 ? `-${item.discount}` : '-'}</td>

                                                                                    <td style={{ padding: 8, textAlign: 'right', fontWeight: 'bold' }}>
                                                                                        {lineTotal.toFixed(2)} ₺
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>

                                                                {/* ALT TOPLAM ALANI */}
                                                                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                                                                    <div style={{ textAlign: 'right', minWidth: '200px' }}>
                                                                        <div style={{ marginBottom: '5px', fontSize: '13px', color: '#7f8c8d' }}>
                                                                            Ürün Toplamı: <b>{itemsTotal.toFixed(2)} ₺</b>
                                                                        </div>
                                                                        {s.shippingCost > 0 && (
                                                                            <div style={{ marginBottom: '5px', fontSize: '13px', color: '#7f8c8d' }}>
                                                                                Nakliye: <b>+{s.shippingCost} ₺</b>
                                                                            </div>
                                                                        )}
                                                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c3e50', borderTop: '1px solid #ddd', paddingTop: '5px' }}>
                                                                            Genel Toplam: {grandTotal.toFixed(2)} ₺
                                                                        </div>
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