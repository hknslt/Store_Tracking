// src/pages/products/ProductAdd.tsx
import { useState, useEffect, useRef } from "react";
// import { useNavigate } from "react-router-dom"; // Artık yönlendirme yapmayacağız
import { addProduct } from "../../services/productService";
import {
  getGroups,
  getCategoriesByGroupId
} from "../../services/definitionService";
import type { Group, Category, Product } from "../../types";

const ProductAdd = () => {
  // const navigate = useNavigate();

  // Listeler
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form Verileri
  const [productName, setProductName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [explanation, setExplanation] = useState("");

  // Mesaj State'i (Alert yerine)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Input'a odaklanmak için
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getGroups().then(setGroups);
  }, []);

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

  // Mesaj Gösterme Yardımcısı
  const showToast = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    // 3 saniye sonra mesajı gizle
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productName || !groupId || !categoryId) {
      showToast('error', "Lütfen Grup, Kategori ve Ürün Adı giriniz!");
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

      showToast('success', "✅ Ürün başarıyla eklendi! Yenisini ekleyebilirsiniz.");

      // Formu temizle (Ama Grup ve Kategori kalsın, seri giriş için)
      setProductName("");
      setExplanation("");

      // İmleci tekrar ürün adına odakla
      nameInputRef.current?.focus();

    } catch (error: any) {
      console.error("Hata:", error);
      showToast('error', "Kayıt başarısız: " + error.message);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <h2 style={{ marginBottom: '20px', color: '#2c3e50', textAlign: 'center' }}>Yeni Ürün Tanımla</h2>

      {/* BİLGİLENDİRME MESAJI (TOAST) */}
      {message && (
        <div style={{
          padding: '12px',
          marginBottom: '20px',
          borderRadius: '6px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          {message.text}
        </div>
      )}

      <p style={{ textAlign: 'center', color: '#7f8c8d', fontSize: '13px', marginBottom: '20px' }}>
        Bu ekranda sadece ürünün genel tanımını yapınız. <br />
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

        {/* 1. GRUP */}
        <div>
          <label style={labelStyle}>Ürün Grubu <span style={{ color: 'red' }}>*</span></label>
          <select value={groupId} onChange={e => handleGroupChange(e.target.value)} style={inputStyle}>
            <option value="">-- Grup Seçiniz --</option>
            {groups.map(g => (<option key={g.id} value={g.id}>{g.groupName}</option>))}
          </select>
        </div>

        {/* 2. KATEGORİ */}
        <div>
          <label style={labelStyle}>Kategori <span style={{ color: 'red' }}>*</span></label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={inputStyle} disabled={!groupId}>
            <option value="">-- Kategori Seçiniz --</option>
            {categories.map(c => (<option key={c.id} value={c.id}>{c.categoryName}</option>))}
          </select>
        </div>

        {/* 3. ÜRÜN ADI */}
        <div>
          <label style={labelStyle}>Ürün Adı <span style={{ color: 'red' }}>*</span></label>
          <input
            ref={nameInputRef}
            placeholder="Ürün Adı"
            value={productName}
            onChange={e => setProductName(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* 4. AÇIKLAMA */}
        <div>
          <label style={labelStyle}>Açıklama</label>
          <textarea
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <button type="submit" style={buttonStyle}>Kaydet ve Yeni Ekle</button>

      </form>
    </div>
  );
};

// --- CSS STYLES ---
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#34495e' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '15px', backgroundColor: '#fff', color: '#333' };
const buttonStyle = { width: '100%', padding: '15px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' };

export default ProductAdd;