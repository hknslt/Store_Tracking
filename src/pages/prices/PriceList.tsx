// src/pages/prices/PriceList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../../services/productService";
import { getAllPrices } from "../../services/priceService";
import { getGroups, getCategories, getDimensions } from "../../services/definitionService";
import type { Product, Group, Category, Dimension } from "../../types";
import "../../App.css";

// Tabloda gösterilecek satır yapısı
interface PriceRow {
  key: string; // unique key
  productName: string;
  categoryName: string;
  dimensionName?: string | null; // Varsa ebat ismi
  price: number;
  groupId: string; // Filtreleme için
}

const PriceList = () => {
  // Ham Veriler
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});

  // İşlenmiş (Düzleştirilmiş) Veriler
  const [displayRows, setDisplayRows] = useState<PriceRow[]>([]);

  // Filtreleme
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);

  // 1. Verileri Çek
  useEffect(() => {
    const loadData = async () => {
      try {
        const [p, g, c, d, pr] = await Promise.all([
          getProducts(), getGroups(), getCategories(), getDimensions(), getAllPrices()
        ]);
        setProducts(p); setGroups(g); setCategories(c); setDimensions(d);

        const map: Record<string, number> = {};
        pr.forEach(x => {
          const key = x.dimensionId ? `${x.productId}_${x.dimensionId}` : `${x.productId}_std`;
          map[key] = x.amount;
        });
        setPriceMap(map);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    loadData();
  }, []);

  // 2. Verileri İşle (Fiyatı olanları listeye dök)
  useEffect(() => {
    if (products.length === 0) return;

    const rows: PriceRow[] = [];

    products.forEach(p => {
      const categoryName = categories.find(c => c.id === p.categoryId)?.categoryName || "";

      // A) Standart Fiyat Kontrolü
      const stdKey = `${p.id}_std`;
      const stdPrice = priceMap[stdKey];
      if (stdPrice && stdPrice > 0) {
        rows.push({
          key: stdKey,
          productName: p.productName,
          categoryName: categoryName,
          dimensionName: null,
          price: stdPrice,
          groupId: p.groupId
        });
      }

      // B) Ebat Fiyatları Kontrolü
      dimensions.forEach(d => {
        const dimKey = `${p.id}_${d.id}`;
        const dimPrice = priceMap[dimKey];
        if (dimPrice && dimPrice > 0) {
          rows.push({
            key: dimKey,
            productName: p.productName,
            categoryName: categoryName,
            dimensionName: d.dimensionName,
            price: dimPrice,
            groupId: p.groupId
          });
        }
      });
    });

    // İsteğe bağlı: İsme göre sırala
    rows.sort((a, b) => a.productName.localeCompare(b.productName));

    setDisplayRows(rows);

  }, [products, priceMap, categories, dimensions]);

  // 3. Filtreleme Mantığı
  const filteredRows = displayRows.filter(row => {
    const matchesGroup = selectedGroupId ? row.groupId === selectedGroupId : true;
    const matchesSearch = row.productName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  if (loading) return <div className="page-container">Yükleniyor...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h2>Ürün Fiyat Listesi</h2>
          <p>Sadece fiyatı tanımlanmış ürünler listelenmektedir.</p>
        </div>

        <Link to="/prices/manage" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          ⚙️ Fiyatları Düzenle
        </Link>
      </div>

      {/* FİLTRELER */}
      <div className="card" style={{ marginBottom: '20px', padding: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
        <select className="form-input" value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} style={{ maxWidth: '200px' }}>
          <option value="">Tüm Gruplar</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
        </select>
        <input
          type="text"
          className="form-input"
          placeholder="Ürün Ara..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
        <div style={{ flex: 1, textAlign: 'right', fontSize: '13px', color: '#777' }}>
          Toplam {filteredRows.length} fiyat kaydı bulundu.
        </div>
      </div>

      {/* TABLO */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                <th style={{ width: '70%' }}>Ürün Bilgisi</th>
                <th style={{ width: '30%', textAlign: 'right' }}>Satış Fiyatı</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map(row => (
                  <tr key={row.key} className="hover-row" style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px 15px' }}>
                      {/* ÜRÜN ADI */}
                      <span style={{ fontWeight: '700', color: '#2c3e50', fontSize: '15px', marginRight: '8px' }}>
                        {row.productName}
                      </span>

                      {/* EBAT (Varsa) - Turuncu */}
                      {row.dimensionName && (
                        <span style={{ color: '#e67e22', fontWeight: '600', marginRight: '8px', fontSize: '14px' }}>
                          {row.dimensionName}
                        </span>
                      )}

                      {/* KATEGORİ - Gri */}
                      <span style={{ color: '#95a5a6', fontStyle: 'italic', fontSize: '13px' }}>
                        {row.categoryName}
                      </span>
                    </td>

                    {/* FİYAT */}
                    <td style={{ textAlign: 'right', padding: '12px 15px', fontWeight: 'bold', fontSize: '16px', color: '#27ae60' }}>
                      {row.price} ₺
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    Kriterlere uygun fiyat kaydı bulunamadı. <br />
                    <small>Ürünlerin fiyatı girilmemiş olabilir.</small>
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

export default PriceList;