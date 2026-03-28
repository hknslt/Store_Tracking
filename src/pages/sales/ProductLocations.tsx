// src/pages/sales/ProductLocations.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc, collectionGroup, getDocs, collection, query, orderBy } from "firebase/firestore";

import { getStores } from "../../services/storeService";
import { getCategories, getCushions, getColors, getDimensions } from "../../services/definitionService";

//     YENİ EKLENEN EXCEL FONKSİYONU
import { exportProductLocationsToExcel } from "../../utils/excelExport";

import type { Store, SystemUser, Category, Cushion, Color, Dimension, Sale, SaleItem } from "../../types";
import "../../App.css";

// Tablo için düzleştirilmiş veri tipi
interface FlattenedItem extends SaleItem {
    saleId: string;
    storeId: string;
    receiptNo: string;
    customerName: string;
    deadline: string;
    saleDate: string;
    locationStatus: { text: string; bg: string; color: string };
    originalSale: Sale;
}

const ProductLocations = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [stores, setStores] = useState<Store[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cushions, setCushions] = useState<Cushion[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);

    const [items, setItems] = useState<FlattenedItem[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof FlattenedItem; direction: 'asc' | 'desc' }>({
        key: 'deadline',
        direction: 'asc'
    });

    useEffect(() => {
        const init = async () => {
            if (!currentUser) return;
            try {
                const [storesData, catsData, cushsData, colsData, dimsData] = await Promise.all([
                    getStores(), getCategories(), getCushions(), getColors(), getDimensions()
                ]);
                setStores(storesData); setCategories(catsData); setCushions(cushsData); setColors(colsData); setDimensions(dimsData);

                const userDoc = await getDoc(doc(db, "personnel", currentUser.uid));
                let uData = userDoc.exists() ? userDoc.data() as SystemUser : null;
                if (!uData) {
                    const adminDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (adminDoc.exists()) uData = adminDoc.data() as SystemUser;
                }

                if (uData) {
                    const hasAdminAccess = ['admin', 'control', 'report'].includes(uData.role);
                    setIsAdmin(hasAdminAccess);

                    if (!hasAdminAccess && uData.storeId) {
                        setSelectedStoreId(uData.storeId);
                    }
                }
            } catch (error) {
                console.error(error);
            }
        };
        init();
    }, [currentUser]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Satışları Çek
                const salesData: Sale[] = [];

                if (selectedStoreId) {
                    // Sadece seçili mağazanın SATIŞLARI
                    const q = query(collection(db, "sales", selectedStoreId, "receipts"), orderBy("date", "desc"));
                    const snap = await getDocs(q);
                    salesData.push(...snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
                } else if (isAdmin) {
                    // Tüm mağazalar (Admin)
                    const q = query(collectionGroup(db, "receipts"), orderBy("date", "desc"));
                    const snap = await getDocs(q);

                    snap.docs.forEach(d => {
                        if (d.ref.path.includes("sales/")) {
                            salesData.push({ id: d.id, ...d.data() } as Sale);
                        }
                    });
                } else {
                    setItems([]);
                    setLoading(false);
                    return;
                }

                // 2. Stokları Çek
                const stocksMap: Record<string, any> = {};
                if (selectedStoreId) {
                    const stockSnap = await getDocs(collection(db, "stores", selectedStoreId, "stocks"));
                    stockSnap.forEach(d => { stocksMap[`${selectedStoreId}_${d.id}`] = d.data(); });
                } else if (isAdmin) {
                    const stockSnap = await getDocs(collectionGroup(db, "stocks"));
                    stockSnap.forEach(d => {
                        const sId = d.ref.parent.parent?.id;
                        if (sId) stocksMap[`${sId}_${d.id}`] = d.data();
                    });
                }

                // 3. Veriyi Düzleştir
                const flattened: FlattenedItem[] = [];

                salesData.forEach(sale => {
                    if ((sale as any).status === 'İptal') return;

                    sale.items.forEach(item => {
                        if (item.status === 'İptal' || item.deliveryStatus === 'Teslim Edildi') return;

                        let locationStatus = { text: 'Bilinmiyor', bg: '#f1f5f9', color: '#64748b' };

                        if (item.supplyMethod === 'Stoktan') {
                            locationStatus = { text: 'Stokta (Depo)', bg: '#dcfce7', color: '#16a34a' };
                        } else {
                            const uniqueStockId = `${item.productId}_${item.colorId}_${item.dimensionId || 'null'}`;
                            const stockData = stocksMap[`${sale.storeId}_${uniqueStockId}`];

                            if (stockData && stockData.reservedStock >= item.quantity) {
                                locationStatus = { text: 'Stokta (Merkezden Geldi)', bg: '#dcfce7', color: '#16a34a' };
                            } else {
                                locationStatus = { text: 'Merkezde (Bekleniyor)', bg: '#fee2e2', color: '#dc2626' };
                            }
                        }

                        flattened.push({
                            ...item,
                            saleId: sale.id!,
                            storeId: sale.storeId,
                            receiptNo: sale.receiptNo,
                            customerName: sale.customerName,
                            deadline: sale.deadline,
                            saleDate: sale.date,
                            locationStatus,
                            originalSale: sale
                        });
                    });
                });

                setItems(flattened);

            } catch (error) {
                console.error("Veri çekme hatası:", error);
            } finally {
                setLoading(false);
            }
        };

        if (isAdmin !== null) fetchData();
    }, [selectedStoreId, isAdmin]);

    const getName = (list: any[], id: string | null | undefined, key: string) => list.find(x => x.id === id)?.[key] || "-";
    const formatDate = (dateString: string) => (!dateString ? "-" : new Date(dateString).toLocaleDateString('tr-TR'));

    const getProcessedItems = () => {
        let filtered = items.filter(item => {
            const searchStr = searchTerm.toLowerCase();
            const cName = (item.customerName || "").toLowerCase();
            const rNo = (item.receiptNo || "").toLowerCase();
            const pName = (item.productName || "").toLowerCase();
            return cName.includes(searchStr) || rNo.includes(searchStr) || pName.includes(searchStr);
        });

        filtered.sort((a, b) => {
            let valA: any = a[sortConfig.key];
            let valB: any = b[sortConfig.key];

            if (sortConfig.key === 'deadline' || sortConfig.key === 'saleDate') {
                valA = new Date(valA || 0).getTime();
                valB = new Date(valB || 0).getTime();
            } else if (sortConfig.key === 'customerName' || sortConfig.key === 'productName' || sortConfig.key === 'receiptNo') {
                const strA = (valA || "").toString();
                const strB = (valB || "").toString();
                return sortConfig.direction === 'asc' ? strA.localeCompare(strB, 'tr', { numeric: true }) : strB.localeCompare(strA, 'tr', { numeric: true });
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    };

    const requestSort = (key: keyof FlattenedItem) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const SortableHeader = ({ label, sortKey }: { label: string, sortKey: keyof FlattenedItem }) => (
        <th onClick={() => requestSort(sortKey)} style={{ cursor: 'pointer', userSelect: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {label}
                {sortConfig.key === sortKey && <span style={{ fontSize: '10px', color: '#8b5cf6' }}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
            </div>
        </th>
    );

    const processedItems = getProcessedItems();

    // EXCEL İNDİRME ÇAĞRISI
    const handleExportExcel = () => {
        const storeName = selectedStoreId ? (stores.find(s => s.id === selectedStoreId)?.storeName || "Magaza") : "Tum_Magazalar";
        exportProductLocationsToExcel(processedItems, storeName, categories, cushions, colors, dimensions);
    };

    return (
        <div className="page-container">
            <div className="modern-header" style={{ marginBottom: '20px' }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        Ürün Konum ve Teslimat Takibi
                    </h2>
                    <p style={{ color: '#64748b' }}>Bekleyen siparişlerin ürün bazlı fiziki durumları</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {/* YENİ EXCEL BUTONU EKLENDİ */}
                    <button onClick={handleExportExcel} className="modern-btn btn-secondary" style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                        Excel İndir
                    </button>
                    <button onClick={() => navigate('/sales')} className="modern-btn btn-secondary">
                        ← Satış Listesine Dön
                    </button>
                </div>
            </div>

            {/* FİLTRELER */}
            <div className="card" style={{ padding: '15px 20px', marginBottom: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {isAdmin && (
                        <div style={{ minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>Mağaza Filtresi</label>
                            <select className="form-input" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                                <option value="">Tüm Mağazalar</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                            </select>
                        </div>
                    )}
                    <div style={{ minWidth: '250px', flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>Ara</label>
                        <input type="text" placeholder="Müşteri, Fiş No veya Ürün Adı..." className="form-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '8px' }} />
                    </div>
                </div>
            </div>

            {/* TABLO */}
            <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Yükleniyor...</div>
                    ) : (
                        <table className="modern-table">
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9' }}>
                                    {isAdmin && <th>Mağaza</th>}
                                    <SortableHeader label="Ürün Bilgisi" sortKey="productName" />
                                    <th>Renk / Minder</th>
                                    <SortableHeader label="Müşteri & Fiş" sortKey="customerName" />
                                    <SortableHeader label="Termin Tarihi" sortKey="deadline" />
                                    <SortableHeader label="Sipariş Tarihi" sortKey="saleDate" />
                                    <th>Ürün Konumu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedItems.length > 0 ? (
                                    processedItems.map((item, idx) => (
                                        <tr
                                            key={idx}
                                            onClick={() => navigate(`/sales/${item.storeId}/${item.saleId}`, { state: { sale: item.originalSale } })}
                                            style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background 0.2s' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            title="Sipariş detayına gitmek için tıklayın"
                                        >
                                            {isAdmin && <td style={{ fontWeight: '600', color: '#334155' }}>{getName(stores, item.storeId, 'storeName')}</td>}

                                            <td>
                                                <div style={{ fontWeight: 'bold', color: '#1e293b' }}>
                                                    {item.productName.split('-')[0].trim()}
                                                    {item.dimensionId && <span style={{ color: '#d35400', marginLeft: '5px' }}>{getName(dimensions, item.dimensionId, 'dimensionName')}</span>}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>({getName(categories, item.categoryId, 'categoryName')})</div>
                                            </td>

                                            <td style={{ fontSize: '13px', color: '#475569' }}>
                                                <div>{getName(colors, item.colorId, 'colorName')}</div>
                                                {item.cushionId && <div>{getName(cushions, item.cushionId, 'cushionName')}</div>}
                                            </td>

                                            <td>
                                                <div style={{ fontWeight: '600', color: '#0f172a' }}>{item.customerName}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>Fiş: {item.receiptNo}</div>
                                            </td>

                                            <td style={{ fontWeight: '600', color: '#ea580c' }}>
                                                {formatDate(item.deadline)}
                                            </td>

                                            <td style={{ color: '#64748b', fontSize: '13px' }}>
                                                {formatDate(item.saleDate)}
                                            </td>

                                            <td>
                                                <span style={{
                                                    backgroundColor: item.locationStatus.bg,
                                                    color: item.locationStatus.color,
                                                    padding: '6px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    display: 'inline-block'
                                                }}>
                                                    {item.locationStatus.text}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                            Bekleyen ürün bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductLocations;