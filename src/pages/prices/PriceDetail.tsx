// src/pages/prices/PriceDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPriceListById } from "../../services/priceService";
import { getProducts } from "../../services/productService";
import { getCategories, getDimensions } from "../../services/definitionService";
import { getStores } from "../../services/storeService";
import type { PriceListModel, Store } from "../../types";
import * as XLSX from "xlsx"; //   Excel kütüphanesi eklendi
import "../../App.css";

interface FlatPriceRow {
    productName: string;
    categoryName: string;
    dimensionName: string | null;
    price: number;
}

const PriceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [priceList, setPriceList] = useState<PriceListModel | null>(null);
    const [stores, setStores] = useState<Store[]>([]);

    // Tablo satırları
    const [priceRows, setPriceRows] = useState<FlatPriceRow[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDetail = async () => {
            if (!id) return;
            try {
                const [listData, sData, pData, cData, dData] = await Promise.all([
                    getPriceListById(id), getStores(), getProducts(), getCategories(), getDimensions()
                ]);

                if (!listData) {
                    navigate('/prices');
                    return;
                }

                setPriceList(listData);
                setStores(sData);

                // Tanımlı fiyatları düz bir tabloya çevir
                const rows: FlatPriceRow[] = [];
                const pricesMap = listData.prices || {};

                Object.keys(pricesMap).forEach(key => {
                    const price = pricesMap[key];
                    if (price > 0) { // Sadece fiyatı girilmişleri göster
                        const [productId, dimId] = key.split('_');
                        const product = pData.find(p => p.id === productId);
                        if (product) {
                            const category = cData.find(c => c.id === product.categoryId)?.categoryName || "-";
                            const dimension = dimId !== 'std' ? dData.find(d => d.id === dimId)?.dimensionName || dimId : null;

                            rows.push({
                                productName: product.productName,
                                categoryName: category,
                                dimensionName: dimension,
                                price: price
                            });
                        }
                    }
                });

                // İsim sırasına göre diz
                rows.sort((a, b) => a.productName.localeCompare(b.productName));
                setPriceRows(rows);

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        loadDetail();
    }, [id, navigate]);

    const getStoreNames = () => {
        if (!priceList?.storeIds || priceList.storeIds.length === 0) return "Hiçbir mağaza seçilmedi.";
        return priceList.storeIds.map(sId => stores.find(s => s.id === sId)?.storeName || "Bilinmeyen").join(", ");
    };

    const filteredRows = priceRows.filter(row =>
        row.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    //   EXCEL'E AKTARMA FONKSİYONU
    const exportToExcel = () => {
        // Excel için verileri uygun başlıklarla formatlıyoruz
        const excelData = filteredRows.map(row => ({
            "Ürün Adı": row.productName,
            "Kategori": row.categoryName,
            "Ebat Türü": row.dimensionName || "Standart",
            "Fiyat (₺)": row.price
        }));

        // Yeni bir çalışma kitabı (workbook) oluştur
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Fiyatlar");

        // Sütun genişliklerini ayarlayalım
        const wscols = [
            { wch: 40 }, // Ürün Adı genişliği
            { wch: 25 }, // Kategori genişliği
            { wch: 20 }, // Ebat genişliği
            { wch: 15 }  // Fiyat genişliği
        ];
        worksheet["!cols"] = wscols;

        // Dosya adı için bugünün tarihini ve liste adını al
        const dateStr = new Date().toLocaleDateString('tr-TR');
        const safeListName = priceList?.name.replace(/[^a-zA-Z0-9 ıİğĞüÜşŞöÖçÇ]/g, "") || "FiyatListesi";

        // Excel dosyasını indir
        XLSX.writeFile(workbook, `${safeListName}_${dateStr}.xlsx`);
    };

    if (loading) return <div className="page-container">Yükleniyor...</div>;
    if (!priceList) return <div className="page-container">Liste bulunamadı.</div>;

    return (
        <div className="page-container">
            <div className="modern-header" style={{ marginBottom: '20px' }}>
                <div>
                    <h2>Fiyat Listesi Detayı</h2>
                    <p>Listenin içeriğini ve tanımlı fiyatları görüntüleyin.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate('/prices/list')} className="modern-btn btn-secondary">← Listelere Dön</button>
                    <button onClick={() => navigate(`/prices/manage/${id}`)} className="modern-btn btn-primary">
                       Listeyi Düzenle
                    </button>
                </div>
            </div>

            {/* BİLGİ KARTLARI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                <div className="card" style={{ padding: '20px', borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginBottom: '5px' }}>LİSTE ADI</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{priceList.name}</div>
                </div>
                <div className="card" style={{ padding: '20px', borderLeft: `4px solid ${priceList.type === 'toptan' ? '#f59e0b' : '#10b981'}` }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginBottom: '5px' }}>LİSTE TÜRÜ</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: priceList.type === 'toptan' ? '#d97706' : '#059669', textTransform: 'capitalize' }}>
                        {priceList.type}
                    </div>
                </div>
                <div className="card" style={{ padding: '20px', borderLeft: '4px solid #8b5cf6' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginBottom: '5px' }}>KULLANAN MAĞAZALAR ({priceList.storeIds?.length || 0})</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>{getStoreNames()}</div>
                </div>
            </div>

            {/* FİYATLAR TABLOSU */}
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Tanımlı Fiyatlar ({filteredRows.length})</h3>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            placeholder="Ürün Ara..."
                            className="form-input"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: '250px' }}
                        />
                        {/*   EXCEL BUTONU */}
                        <button
                            onClick={exportToExcel}
                            className="modern-btn"
                            style={{ backgroundColor: '#10b981', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
                            disabled={filteredRows.length === 0}
                        >
                            Excel İndir
                        </button>
                    </div>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="modern-table">
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th style={{ width: '40%' }}>Ürün Adı</th>
                                <th style={{ width: '25%' }}>Kategori</th>
                                <th style={{ width: '20%' }}>Ebat Türü</th>
                                <th style={{ width: '15%', textAlign: 'right' }}>Fiyat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length > 0 ? (
                                filteredRows.map((row, idx) => (
                                    <tr key={idx} className="hover-row">
                                        <td style={{ fontWeight: '600', color: '#334155' }}>{row.productName}</td>
                                        <td style={{ color: '#64748b' }}>{row.categoryName}</td>
                                        <td>
                                            {row.dimensionName ? (
                                                <span style={{ color: '#e67e22', fontWeight: '600', fontSize: '13px' }}>{row.dimensionName}</span>
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Standart</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '16px', color: '#10b981' }}>
                                            {row.price.toLocaleString('tr-TR')} ₺
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                        Bu listede tanımlı ürün fiyatı bulunmamaktadır.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PriceDetail;