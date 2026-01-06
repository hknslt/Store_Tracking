// src/pages/products/ProductAdd.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addProductBatch } from "../../services/productService"; // Yeni batch fonksiyonu
import {
  getGroups,
  getCategoriesByGroupId,
  getColors,
  getDimensions
  // getCushions sildik
} from "../../services/definitionService";
import type { Group, Category, Color, Dimension } from "../../types";

const ProductAdd = () => {
  const navigate = useNavigate();

  // Listeler
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);

  // Form Verileri
  const [productName, setProductName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dimensionId, setDimensionId] = useState(""); // Opsiyonel
  const [explanation, setExplanation] = useState("");

  // ÇOKLU RENK SEÇİMİ İÇİN STATE
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  useEffect(() => {
    getGroups().then(setGroups);
    getColors().then(setColors);
    getDimensions().then(setDimensions);
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

  // Renk Checkbox İşlemi
  const toggleColor = (colorId: string) => {
    setSelectedColors(prev =>
      prev.includes(colorId)
        ? prev.filter(c => c !== colorId) // Varsa çıkar
        : [...prev, colorId] // Yoksa ekle
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Zorunlu alan kontrolü
    if (!productName || !groupId || !categoryId) {
      alert("Lütfen Ürün Adı, Grup ve Kategori giriniz!");
      return;
    }

    if (selectedColors.length === 0) {
      alert("Lütfen en az bir renk seçiniz!");
      return;
    }

    try {
      // Temel veri (Renksiz)
      const baseProductData = {
        productName,
        groupId,
        categoryId,
        dimensionId: dimensionId || null,
        explanation: explanation || ""
      };

      // Toplu Kayıt Fonksiyonunu Çağır
      await addProductBatch(baseProductData, selectedColors);

      alert(`✅ ${selectedColors.length} adet ürün varyantı oluşturuldu!`);
      navigate("/products");
    } catch (error: any) {
      console.error("Detaylı Hata:", error);
      alert("Hata Detayı: " + error.message);
    }
  };

  return (
    <div style={{ maxWidth: '800px', backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Yeni Ürün Tanımla</h2>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* --- SOL TARAFTAKİ SEÇİMLER --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

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
            <input placeholder="Ürün Adı" value={productName} onChange={e => setProductName(e.target.value)} style={inputStyle} />
          </div>

          {/* 4. EBAT (Opsiyonel) */}
          <div>
            <label style={labelStyle}>Ebat / Ölçü (Masalı Takımlarda)</label>
            <select value={dimensionId} onChange={e => setDimensionId(e.target.value)} style={inputStyle}>
              <option value="">-- Seçiniz (Yok) --</option>
              {dimensions.map(d => (<option key={d.id} value={d.id}>{d.dimensionName}</option>))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Açıklama</label>
            <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>

        {/* --- SAĞ TARAF: ÇOKLU RENK SEÇİMİ --- */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
          <label style={{ ...labelStyle, marginBottom: '15px', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>
            Mevcut Renkler <span style={{ color: 'red' }}>*</span>
            <span style={{ float: 'right', fontSize: '11px', fontWeight: 'normal', color: '#666' }}>
              ({selectedColors.length} seçildi)
            </span>
          </label>

          <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {colors.map(c => (
              <div
                key={c.id}
                onClick={() => toggleColor(c.id!)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  backgroundColor: selectedColors.includes(c.id!) ? '#d6eaf8' : 'white',
                  border: selectedColors.includes(c.id!) ? '1px solid #3498db' : '1px solid #ddd',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  transition: '0.2s'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedColors.includes(c.id!)}
                  onChange={() => { }} // onClick div'de hallediyor
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', fontWeight: '500' }}>{c.colorName}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: '#999', marginTop: '10px' }}>
            * Seçtiğiniz her renk için ayrı bir ürün kartı oluşturulacaktır.
          </p>
        </div>

        {/* KAYDET BUTONU (Tam Genişlik) */}
        <div style={{ gridColumn: 'span 2' }}>
          <button type="submit" style={buttonStyle}>Ürünleri Oluştur</button>
        </div>

      </form>
    </div>
  );
};

const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#34495e' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '14px', backgroundColor: '#fff', color: '#333' };
const buttonStyle = { width: '100%', padding: '15px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' };

export default ProductAdd;