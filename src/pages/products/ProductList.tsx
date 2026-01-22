// src/pages/products/ProductList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts, updateProduct, deleteProduct } from "../../services/productService";
import { getGroups, getCategories } from "../../services/definitionService";
import type { Product, Group, Category } from "../../types";
import "../../App.css";

// İkonlar
import EditIcon from "../../assets/icons/edit.svg";
import TrashIcon from "../../assets/icons/trash.svg";

const ProductList = () => {
  // --- STATE'LER ---
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Mesaj ve Bildirimler
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Accordion State
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // Modal State (Düzenleme)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ productName: "", explanation: "" });

  // 🔥 Modal State (Silme Onayı)
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, id: string | null }>({ show: false, id: null });

  // Toast Mesajı Gösterici (Otomatik Kapanır)
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // --- VERİ YÜKLEME ---
  useEffect(() => {
    loadData();
  }, []);

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
      setMessage({ type: 'error', text: "Veriler yüklenemedi." });
    } finally {
      setLoading(false);
    }
  };

  // --- SİLME İŞLEMİ (ONAYLI) ---

  // 1. Silme butonuna basınca modalı aç
  const requestDelete = (id: string) => {
    setConfirmModal({ show: true, id });
  };

  // 2. Modaldaki "Evet" butonuna basınca sil
  const confirmDelete = async () => {
    if (!confirmModal.id) return;

    try {
      await deleteProduct(confirmModal.id);
      setProducts(prev => prev.filter(p => p.id !== confirmModal.id));
      setMessage({ type: 'success', text: "Ürün başarıyla silindi." });
    } catch (error) {
      setMessage({ type: 'error', text: "Silme işlemi başarısız." });
    } finally {
      setConfirmModal({ show: false, id: null }); // Modalı kapat
    }
  };

  // --- DÜZENLEME İŞLEMİ ---

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      productName: product.productName,
      explanation: product.explanation || ""
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.id || !editForm.productName.trim()) return;

    try {
      await updateProduct(editingProduct.id, {
        productName: editForm.productName,
        explanation: editForm.explanation
      });

      // State'i güncelle (Tekrar fetch yapmamak için)
      setProducts(prev => prev.map(p =>
        p.id === editingProduct.id
          ? { ...p, productName: editForm.productName, explanation: editForm.explanation }
          : p
      ));

      setMessage({ type: 'success', text: "Ürün güncellendi." });
      setIsEditModalOpen(false);
    } catch (error) {
      setMessage({ type: 'error', text: "Güncelleme başarısız." });
    }
  };

  // Grup Aç/Kapa
  const toggleGroup = (id: string) => {
    setExpandedGroupId(expandedGroupId === id ? null : id);
  };

  if (loading) return <div className="page-container">Yükleniyor...</div>;

  return (
    <div className="page-container">
      {/* TOAST MESAJI */}
      {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

      {/* ONAY MODALI (SİLME İÇİN) */}
      {confirmModal.show && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '300px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Emin misiniz?</h3>
            <p style={{ color: '#555', fontSize: '14px', marginBottom: '20px' }}>Bu ürün kalıcı olarak silinecek.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button onClick={() => setConfirmModal({ show: false, id: null })} className="btn btn-secondary">Vazgeç</button>
              <button onClick={confirmDelete} className="btn btn-danger">Evet, Sil</button>
            </div>
          </div>
        </div>
      )}

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

      {/* --- LİSTE --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {groups.map(group => {
          const groupCategories = categories.filter(c => c.groupId === group.id);
          const isExpanded = expandedGroupId === group.id;

          return (
            <div key={group.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* GRUP BAŞLIĞI */}
              <div
                onClick={() => toggleGroup(group.id!)}
                style={{
                  padding: '15px 20px',
                  backgroundColor: isExpanded ? '#2c3e50' : '#fff',
                  color: isExpanded ? 'white' : '#2c3e50',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: '600'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isExpanded ? '▼' : '▶'} {group.groupName}
                </span>
                <span style={{ fontSize: '12px', opacity: 0.8, fontWeight: 'normal' }}>
                  {groupCategories.length} Kategori
                </span>
              </div>

              {/* GRUP İÇERİĞİ */}
              {isExpanded && (
                <div style={{ backgroundColor: '#f8f9fa', padding: '15px' }}>
                  <div className="dashboard-grid">
                    {groupCategories.map(category => {
                      const categoryProducts = products.filter(p => p.categoryId === category.id);

                      return (
                        <div key={category.id} className="card" style={{ marginBottom: 0, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                          <div className="card-header" style={{ borderBottom: '2px solid #3498db', paddingBottom: '10px', marginBottom: '10px' }}>
                            <h4 className="card-title" style={{ fontSize: '15px' }}>{category.categoryName}</h4>
                            <span className="badge" style={{ backgroundColor: '#eef2f7', color: '#2c3e50' }}>{categoryProducts.length}</span>
                          </div>

                          <div className="card-body" style={{ padding: 0 }}>
                            {categoryProducts.length === 0 ? (
                              <div style={{ padding: '10px', textAlign: 'center', color: '#ccc', fontSize: '12px' }}>Ürün yok.</div>
                            ) : (
                              <table className="data-table dense">
                                <tbody>
                                  {categoryProducts.map(p => (
                                    <tr key={p.id}>
                                      <td style={{ padding: '8px 5px', fontSize: '13px' }}>
                                        <div style={{ fontWeight: '600', color: '#444' }}>{p.productName}</div>
                                        {p.explanation && <div style={{ fontSize: '11px', color: '#999' }}>{p.explanation}</div>}
                                      </td>
                                      <td style={{ width: '70px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px' }}>
                                          <button onClick={() => openEditModal(p)} className="action-btn" title="Düzenle" style={{ background: '#f0f9ff' }}>
                                            <img src={EditIcon} style={{ width: '16px', opacity: 0.7 }} />
                                          </button>
                                          <button onClick={() => p.id && requestDelete(p.id)} className="action-btn" title="Sil" style={{ background: '#fff0f0' }}>
                                            <img src={TrashIcon} style={{ width: '16px', opacity: 0.7 }} />
                                          </button>
                                        </div>
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
                  {groupCategories.length === 0 && <div style={{ textAlign: 'center', color: '#999', padding: '10px' }}>Bu grupta kategori yok.</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- DÜZENLEME MODALI --- */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Ürün Düzenle</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="close-btn">×</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label>Ürün Adı</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.productName}
                  onChange={e => setEditForm({ ...editForm, productName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Açıklama</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.explanation}
                  onChange={e => setEditForm({ ...editForm, explanation: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">İptal</button>
                <button type="submit" className="btn btn-primary">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;