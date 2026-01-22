import { useState, useEffect, useRef } from "react";
import { addProduct } from "../../services/productService";
import { getGroups, getCategoriesByGroupId } from "../../services/definitionService";
import type { Group, Category, Product } from "../../types";
import "../../App.css";

const ProductAdd = () => {
  // Listeler
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form Verileri
  const [productName, setProductName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [explanation, setExplanation] = useState("");

  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getGroups().then(setGroups);
  }, []);

  // Toast Mesajı
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleGroupChange = async (val: string) => {
    setGroupId(val);
    setCategoryId("");
    if (val) {
      const cats = await getCategoriesByGroupId(val);
      setCategories(cats);
    } else {
      setCategories([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productName || !groupId || !categoryId) {
      setMessage({ type: 'error', text: "Lütfen Grup, Kategori ve Ürün Adı giriniz!" });
      return;
    }

    try {
      const newProduct: Product = {
        productName: productName.trim(),
        categoryId,
        groupId,
        explanation: explanation || ""
      };

      await addProduct(newProduct);

      setMessage({ type: 'success', text: "✅ Ürün başarıyla eklendi!" });

      // Formu temizle (Grup ve Kategori hariç)
      setProductName("");
      setExplanation("");
      nameInputRef.current?.focus();

    } catch (error: any) {
      setMessage({ type: 'error', text: "Kayıt başarısız: " + error.message });
    }
  };

  return (
    <div className="page-container">
      {message && <div className={`toast-message ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>{message.text}</div>}

      <div className="page-header">
        <div className="page-title">
          <h2>Yeni Ürün Tanımla</h2>
          <p>Envantere yeni bir ürün ekleyin</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Ürün Grubu <span style={{ color: 'red' }}>*</span></label>
            <select
              className="form-input"
              value={groupId}
              onChange={e => handleGroupChange(e.target.value)}
            >
              <option value="">-- Grup Seçiniz --</option>
              {groups.map(g => (<option key={g.id} value={g.id}>{g.groupName}</option>))}
            </select>
          </div>

          <div className="form-group">
            <label>Kategori <span style={{ color: 'red' }}>*</span></label>
            <select
              className="form-input"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              disabled={!groupId}
            >
              <option value="">-- Kategori Seçiniz --</option>
              {categories.map(c => (<option key={c.id} value={c.id}>{c.categoryName}</option>))}
            </select>
          </div>

          <div className="form-group">
            <label>Ürün Adı <span style={{ color: 'red' }}>*</span></label>
            <input
              ref={nameInputRef}
              className="form-input"
              placeholder="Örn: Yemek Odası Takımı"
              value={productName}
              onChange={e => setProductName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Açıklama <span style={{ fontSize: '12px', color: '#999' }}>(Opsiyonel)</span></label>
            <textarea
              className="form-input"
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <button type="submit" className="btn btn-success" style={{ width: '100%', marginTop: '10px' }}>
            Kaydet ve Yeni Ekle
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProductAdd;