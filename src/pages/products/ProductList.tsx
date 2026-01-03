import { useEffect, useState } from "react";
import { getProducts } from "../../services/productService";

import { Link } from "react-router-dom";
import type { Product } from "../../types";

const ProductList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Yükleniyor...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Ürün Listesi ({products.length})</h1>
        <Link to="/products/add" style={{ padding: '10px 20px', backgroundColor: '#3498db', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>+ Yeni Ekle</Link>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
            <th style={thStyle}>Ürün Adı</th>
            <th style={thStyle}>Renk</th>
            <th style={thStyle}>Grup ID</th>
            <th style={thStyle}>Kategori ID</th>
            <th style={thStyle}>Minder</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={tdStyle}>{p.productName}</td>
              <td style={tdStyle}>{p.colorId}</td>
              <td style={tdStyle}>{p.groupId}</td>
              <td style={tdStyle}>{p.categoryId}</td>
              <td style={tdStyle}>{p.cushionId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const thStyle = { padding: '12px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px' };

export default ProductList;