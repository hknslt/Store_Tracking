// src/pages/products/ProductList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../../services/productService";
import { getGroups, getCategories } from "../../services/definitionService";
import type { Product, Group, Category } from "../../types";
import "../../App.css";

const ProductList = () => {
  // --- STATE'LER ---
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Açık olan grubun ID'sini tutar
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // --- VERİ YÜKLEME ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const [pData, gData, cData] = await Promise.all([
          getProducts(),
          getGroups(),
          getCategories()
        ]);
        setProducts(pData);
        setGroups(gData);
        setCategories(cData);
      } catch (error) {
        console.error("Veri yükleme hatası:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Grup Aç/Kapa
  const toggleGroup = (id: string) => {
    if (expandedGroupId === id) {
      setExpandedGroupId(null); // Açıksa kapat
    } else {
      setExpandedGroupId(id); // Kapalıysa aç
    }
  };

  if (loading) return <div className="page-container">Yükleniyor...</div>;

  return (
    <div className="page-container">
      {/* --- HEADER --- */}
      <div className="page-header">
        <div className="page-title">
          <h2>Ürün Listesi</h2>
          <p>Toplam {groups.length} grup, {products.length} ürün</p>
        </div>
        <Link to="/products/add" className="btn btn-primary">
          + Yeni Ürün Tanımla
        </Link>
      </div>

      {/* --- GRUP LİSTESİ (ACCORDION) --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {groups.map(group => {
          // Bu gruba ait kategorileri bul
          const groupCategories = categories.filter(c => c.groupId === group.id);
          const isExpanded = expandedGroupId === group.id;

          return (
            <div key={group.id} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white' }}>

              {/* GRUP BAŞLIĞI (TIKLANABİLİR) */}
              <div
                onClick={() => toggleGroup(group.id!)}
                style={{
                  padding: '15px 20px',
                  backgroundColor: isExpanded ? '#2c3e50' : '#f8f9fa',
                  color: isExpanded ? 'white' : '#2c3e50',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isExpanded ? '▼' : '▶'} {group.groupName}
                </h3>
                <span style={{ fontSize: '13px', opacity: 0.8 }}>
                  {groupCategories.length} Kategori
                </span>
              </div>

              {/* GRUP İÇERİĞİ (KATEGORİ KARTLARI) */}
              {isExpanded && (
                <div style={{ padding: '20px', backgroundColor: '#f1f2f6' }}>

                  {/* Kategori Grid Yapısı */}
                  <div className="dashboard-grid">
                    {groupCategories.map(category => {
                      // Bu kategoriye ait ürünleri filtrele
                      const categoryProducts = products.filter(p => p.categoryId === category.id);

                      return (
                        <div key={category.id} className="card" style={{ marginBottom: 0 }}>
                          {/* Kategori Başlığı */}
                          <div className="card-header" style={{ justifyContent: 'space-between', borderBottom: '2px solid #3498db' }}>
                            <h4 className="card-title" style={{ fontSize: '16px' }}>{category.categoryName}</h4>
                            <span className="badge" style={{ backgroundColor: '#eef2f7', color: '#2c3e50' }}>
                              {categoryProducts.length}
                            </span>
                          </div>

                          {/* Ürün Listesi */}
                          <div className="card-body" style={{ padding: 0 }}>
                            {categoryProducts.length === 0 ? (
                              <div style={{ padding: '15px', textAlign: 'center', color: '#ccc', fontStyle: 'italic', fontSize: '12px' }}>
                                Ürün yok.
                              </div>
                            ) : (
                              <table className="data-table dense">
                                <tbody>
                                  {categoryProducts.map(p => (
                                    <tr key={p.id}>
                                      <td style={{ padding: '8px 15px', color: '#555', fontSize: '13px' }}>
                                        • {p.productName}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {groupCategories.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                      Bu gruba ait kategori bulunamadı.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {groups.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999', backgroundColor: 'white', borderRadius: '8px' }}>
            Henüz grup tanımlanmamış.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;