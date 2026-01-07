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

  // İsim getirme yardımcısı (Eğer yoksa '-' döner)
  const getName = (list: any[], id: string | undefined | null, nameKey: string) => {
    if (!id) return "-";
    const item = list.find(x => x.id === id);
    return item ? item[nameKey] : "-";
  };

  if (loading) return <div className="page-container">Yükleniyor...</div>;

  return (
    <div className="page-container">
      {/* --- BAŞLIK VE BUTON --- */}
      <div className="page-header">
        <div className="page-title">
          <h2>Ürün Listesi</h2>
          <p>Toplam {products.length} ürün tanımlı</p>
        </div>
        <Link to="/products/add" className="btn btn-primary">
          + Yeni Ürün
        </Link>
      </div>

      {/* --- LİSTE KARTI --- */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {products.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
              Henüz sisteme kayıtlı ürün bulunmuyor.
            </div>
          ) : (
            <table className="data-table dense">
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ width: '50%' }}>Ürün Bilgisi</th>
                  <th style={{ width: '30%' }}>Renk</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const groupName = getName(groups, p.groupId, 'groupName');
                  const categoryName = getName(categories, p.categoryId, 'categoryName');
                  const dimensionName = p.dimensionId ? getName(dimensions, p.dimensionId, 'dimensionName') : null;
                  const colorName = getName(colors, p.colorId, 'colorName');

                  return (
                    <tr key={p.id}>
                      {/* Ürün Bilgisi (Ad + Ebat + Grup/Kategori) */}
                      <td style={{ padding: '10px 15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{ fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                            {p.productName}
                          </span>

                          {/* Ebat varsa turuncu renkte göster */}
                          {dimensionName && dimensionName !== '-' && (
                            <span style={{ color: '#e67e22', fontWeight: 'bold', fontSize: '13px' }}>
                              {dimensionName}
                            </span>
                          )}
                          <span style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '2px' }}>{categoryName}</span>
                        </div>

                      </td>

                      {/* Renk */}
                      <td style={{ padding: '10px 15px', verticalAlign: 'middle' }}>
                        {colorName !== '-' ? (
                          <span style={{ fontWeight: '500', color: '#555' }}>{colorName}</span>
                        ) : (
                          <span style={{ color: '#ccc' }}>-</span>
                        )}
                      </td>

                      {/* İşlem Butonu */}
                      <td style={{ textAlign: 'right', padding: '10px 15px', verticalAlign: 'middle' }}>
                        <Link
                          to={`/products/detail/${p.id}`}
                          className="btn btn-primary"
                          style={{
                            padding: '5px 12px',
                            fontSize: '12px',
                            textDecoration: 'none'
                          }}
                        >
                          Detay
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductList;