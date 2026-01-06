// src/pages/products/ProductList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../../services/productService";
import {
  getGroups,
  getCategories,
  getColors,
  getDimensions
} from "../../services/definitionService";
import type { Product, Group, Category, Color, Dimension } from "../../types";
import "../../App.css"; // Ortak stiller

const ProductList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pData, gData, cData, colData, dData] = await Promise.all([
        getProducts(),
        getGroups(),
        getCategories(),
        getColors(),
        getDimensions()
      ]);

      setProducts(pData);
      setGroups(gData);
      setCategories(cData);
      setColors(colData);
      setDimensions(dData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getName = (list: any[], id: string | undefined | null, nameKey: string) => {
    if (!id) return <span style={{ color: '#ccc' }}>-</span>;
    const item = list.find(x => x.id === id);
    return item ? item[nameKey] : <span style={{ color: '#ccc' }}>-</span>;
  };

  if (loading) return <div className="page-container">Yükleniyor...</div>;

  return (
    <div className="page-container">
      {/* --- BAŞLIK VE YENİ EKLE BUTONU --- */}
      <div className="page-header">
        <div className="page-title">
          <h2>Ürün Listesi</h2>
          <p>Toplam {products.length} ürün listeleniyor</p>
        </div>
        <Link to="/products/add" className="btn btn-primary">
          + Yeni Ürün
        </Link>
      </div>

      {/* --- TABLO KARTI --- */}
      <div className="card">
        <div className="card-body">
          {products.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
              Henüz ürün eklenmemiş.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {/* "dense" sınıfı CSS'e eklediğimiz sıkıştırma için */}
              <table className="data-table dense">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Ürün Adı</th>
                    <th style={{ width: '25%' }}>Grup &rsaquo; Kategori</th>
                    <th style={{ width: '15%' }}>Renk</th>
                    <th style={{ width: '15%' }}>Ebat</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      {/* Ürün Adı */}
                      <td>
                        <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                          {p.productName}
                        </div>
                      </td>

                      {/* Grup > Kategori (Yan yana) */}
                      <td>
                        <span style={{ fontWeight: '500', color: '#7f8c8d' }}>
                          {getName(groups, p.groupId, 'groupName')}
                        </span>
                        <span style={{ margin: '0 5px', color: '#bdc3c7' }}>&rsaquo;</span>
                        <span style={{ color: '#2c3e50' }}>
                          {getName(categories, p.categoryId, 'categoryName')}
                        </span>
                      </td>

                      {/* Renk */}
                      <td>
                        {/* Renk isminin yanına küçük bir kutucuk koyabiliriz (opsiyonel) */}
                        {getName(colors, p.colorId, 'colorName')}
                      </td>

                      {/* Ebat */}
                      <td>
                        <span className="badge" style={{ backgroundColor: '#f1f2f6', color: '#555' }}>
                          {getName(dimensions, p.dimensionId, 'dimensionName')}
                        </span>
                      </td>

                      {/* İşlem Butonu */}
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          to={`/products/detail/${p.id}`}
                          className="btn btn-primary"
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            height: 'auto',
                            minWidth: 'auto'
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductList;