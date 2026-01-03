// src/pages/products/ProductList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../../services/productService";
// Tüm tanımlama servisleri
import {
  getGroups,
  getCategories,
  getColors,
  getDimensions,
  getCushions
} from "../../services/definitionService";
import type { Product, Group, Category, Color, Dimension, Cushion } from "../../types";

const ProductList = () => {
  const [products, setProducts] = useState<Product[]>([]);

  // Referans listeleri
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [cushions, setCushions] = useState<Cushion[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Hepsini paralel olarak çek (Performans için önemli)
      const [pData, gData, cData, colData, dData, cushData] = await Promise.all([
        getProducts(),
        getGroups(),
        getCategories(),
        getColors(),
        getDimensions(),
        getCushions()
      ]);

      setProducts(pData);
      setGroups(gData);
      setCategories(cData);
      setColors(colData);
      setDimensions(dData);
      setCushions(cushData);

    } catch (error) {
      console.error("Veri hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- İSİM BULUCU YARDIMCI FONKSİYONLAR ---
  // Listeden ID'ye göre ismi bulur, bulamazsa "-" koyar veya ID'yi gösterir.

  const getName = (list: any[], id: string | undefined, nameKey: string) => {
    if (!id) return "-";
    const item = list.find(x => x.id === id);
    return item ? item[nameKey] : "Silinmiş Veri";
  };

  if (loading) return <p>Yükleniyor...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#2c3e50' }}>Ürün Listesi ({products.length})</h1>
        <Link to="/products/add" style={{ padding: '10px 20px', backgroundColor: '#3498db', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>+ Yeni Ekle</Link>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left', color: '#2c3e50' }}>
            <th style={thStyle}>Ürün Adı</th>
            <th style={thStyle}>Grup</th>
            <th style={thStyle}>Kategori</th>
            <th style={thStyle}>Renk</th>
            <th style={thStyle}>Minder</th>
            <th style={thStyle}>Ebat</th>
            <th style={thStyle}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={tdStyle}><b>{p.productName}</b></td>
              <td style={tdStyle}>{getName(groups, p.groupId, 'groupName')}</td>
              <td style={tdStyle}>{getName(categories, p.categoryId, 'categoryName')}</td>
              <td style={tdStyle}>{getName(colors, p.colorId, 'colorName')}</td>
              <td style={tdStyle}>{getName(cushions, p.cushionId, 'cushionName')}</td>
              <td style={tdStyle}>{getName(dimensions, p.dimension, 'dimensionName')}</td>
              <td style={tdStyle}>
                <Link
                  to={`/products/detail/${p.id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'white',
                    backgroundColor: '#3498db',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                >
                  Detay
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const thStyle = { padding: '15px', borderBottom: '2px solid #e9ecef', fontWeight: '600', fontSize: '14px' };
const tdStyle = { padding: '15px', color: '#555', fontSize: '14px' };

export default ProductList;